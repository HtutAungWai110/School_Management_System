"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Minus, Plus, TriangleAlert } from "lucide-react"
import { cropToCanvas, type Crop, type PixelCrop } from "react-image-crop"

import { Button } from "@/components/ui/button"
import { ImageCrop } from "@/components/ui/image-crop"
import { useProfileStore } from "@/components/profile/profile.state"
import { createClient } from "@/lib/supabase/browser.client"
import type { Profile } from "@/types/profile.type"
import { cn } from "@/lib/utils.util"

const BUCKET = "profile_pictures"
const MAX_BYTES = 10 * 1024 * 1024
const OUTPUT_TYPE = "image/jpeg"
const OUTPUT_QUALITY = 0.9

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1
/** Keeps the fitted image clear of the viewport's scrollbar gutter at zoom 1. */
const FIT_PADDING = 8
const MIN_SELECTION = 64

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY))
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const probe = new window.Image()
    probe.onload = () => resolve(probe)
    probe.onerror = () => reject(new Error("That file could not be read as an image."))
    probe.src = src
  })
}

function toPixelCrop(next: Crop, width: number, height: number): PixelCrop {
  // Crop is a union of unit values rather than a discriminated object, so the
  // pixel case is expressed as a scale of 1 instead of a narrowed return.
  const scaleX = next.unit === "px" ? 1 : width / 100
  const scaleY = next.unit === "px" ? 1 : height / 100

  return {
    unit: "px",
    x: next.x * scaleX,
    y: next.y * scaleY,
    width: next.width * scaleX,
    height: next.height * scaleY,
  }
}

function centreViewportOnSelection(viewport: HTMLElement | null, selection: PixelCrop | null) {
  if (!viewport || !selection) return
  viewport.scrollLeft = selection.x + selection.width / 2 - viewport.clientWidth / 2
  viewport.scrollTop = selection.y + selection.height / 2 - viewport.clientHeight / 2
}

export default function ProfileAvatarUpload({ profile }: { profile: Profile }) {
  const router = useRouter()
  const setProfile = useProfileStore((state) => state.setProfile)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const cropRef = useRef<PixelCrop | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const loadTokenRef = useRef(0)
  const zoomRef = useRef(MIN_ZOOM)

  const [open, setOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>({ unit: "%", x: 0, y: 0, width: 100, height: 100 })
  const [baseSize, setBaseSize] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function releaseObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  useEffect(() => releaseObjectUrl, [])

  function close() {
    loadTokenRef.current += 1
    releaseObjectUrl()
    setOpen(false)
    setImageSrc(null)
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 })
    setBaseSize(null)
    zoomRef.current = MIN_ZOOM
    setZoom(MIN_ZOOM)
    setReady(false)
    setError(null)
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file — JPG, PNG, WebP or AVIF.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 10 MB. Pick a smaller one.")
      return
    }

    loadTokenRef.current += 1
    releaseObjectUrl()
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url

    cropRef.current = null
    setImageSrc(url)
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 })
    setBaseSize(null)
    zoomRef.current = MIN_ZOOM
    setZoom(MIN_ZOOM)
    setReady(false)
    setError(null)
    setOpen(true)
  }

  /** Zoom changes the image's real layout size so the cropper's own coordinate
   *  maths stays valid, which means the selection has to be rescaled with it.
   *  Read through a ref so this stays synchronous rather than nesting one state
   *  update inside another updater. */
  function changeZoom(delta: number) {
    const current = zoomRef.current
    const next = clampZoom(current + delta)
    if (next === current) return

    const ratio = next / current
    const selection = cropRef.current
    if (selection) {
      const scaled: PixelCrop = {
        unit: "px",
        x: selection.x * ratio,
        y: selection.y * ratio,
        width: selection.width * ratio,
        height: selection.height * ratio,
      }
      cropRef.current = scaled
      setCrop(scaled)
    }

    zoomRef.current = next
    setZoom(next)
  }

  /* React's onWheel is registered passively, so preventDefault there is a
     no-op. A non-passive native listener is the only way to stop the page
     scrolling behind the dialog while zooming. */
  useEffect(() => {
    const viewport = viewportRef.current
    if (!open || !ready || !viewport) return

    function handleWheel(event: WheelEvent) {
      event.preventDefault()
      changeZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
      requestAnimationFrame(() => centreViewportOnSelection(viewport, cropRef.current))
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false })
    return () => viewport.removeEventListener("wheel", handleWheel)
  }, [open, ready])

  /**
   * The whole selection is set up here rather than waiting for a drag, so the
   * crop is usable the instant the image appears. Reading the intrinsic size
   * from a detached probe avoids depending on this element's on-screen layout.
   */
  async function handleImageLoad() {
    const src = imageSrc
    const viewport = viewportRef.current
    if (!src || !viewport) return

    const token = loadTokenRef.current
    try {
      const probe = await loadImage(src)
      if (token !== loadTokenRef.current) return

      const fit = Math.min(
        (viewport.clientWidth - FIT_PADDING) / probe.naturalWidth,
        (viewport.clientHeight - FIT_PADDING) / probe.naturalHeight,
        1
      )
      const size = { w: probe.naturalWidth * fit, h: probe.naturalHeight * fit }

      setBaseSize(size)
      zoomRef.current = MIN_ZOOM
      setZoom(MIN_ZOOM)

      const side = Math.min(size.w, size.h)
      const selection: PixelCrop = {
        unit: "px",
        x: (size.w - side) / 2,
        y: (size.h - side) / 2,
        width: side,
        height: side,
      }
      cropRef.current = selection
      setCrop(selection)
      setError(null)
      setReady(true)
    } catch (err) {
      if (token !== loadTokenRef.current) return
      setError(err instanceof Error ? err.message : "That file could not be read as an image.")
    }
  }

  async function upload(blob: Blob) {
    const supabase = createClient()

    // Versioned filename so a re-crop is never served from cache, and the
    // previous object is dropped so re-uploading does not pile up files.
    const previous = previousObjectPath(profile.avatar_url)
    const path = `${profile.id}/avatar-${Date.now()}.jpg`


    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: OUTPUT_TYPE, upsert: false })

    if (uploadError) throw new Error(uploadError.message)

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const res = await fetch(`/api/profile/${profile.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: publicUrl }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Could not save your new profile picture.")
    }

    const result = await res.json()
    setProfile(result.profileData as Profile)

    if (previous) {

      const relativePath = previous.replace(/^profile_pictures\//, '');

      await supabase.storage
        .from(BUCKET)
        .remove([relativePath]);

    }
  }

  async function applyCrop() {
    const img = imageRef.current
    if (!img) {
      setError("Wait for the image to finish loading, then crop it.")
      return
    }

    // The selection normally exists from the moment the image loads; this
    // covers the case where it has not been measured yet.
    const selection = cropRef.current ?? toPixelCrop(crop, img.width, img.height)
    if (selection.width < MIN_SELECTION || selection.height < MIN_SELECTION) {
      setError("That selection is too small. Drag it out to at least 64 × 64 pixels.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const canvas = document.createElement("canvas")
      await cropToCanvas(img, canvas, selection)

      const blob = await canvasToBlob(canvas)
      if (!blob) throw new Error("Could not process that image. Try a different file.")

      await upload(blob)
      close()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <span className="relative shrink-0">
        <span className="grid size-16 place-items-center overflow-hidden rounded-full bg-primary-container text-primary">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="size-full object-cover"
            />
          ) : (
            <span className="text-[18px] font-bold">{getInitials(profile.full_name ?? "")}</span>
          )}
        </span>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Change profile picture"
          className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border border-border bg-surface-container-lowest text-primary shadow-sm transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Camera className="size-3.5" />
        </button>
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={pickFile}
        className="sr-only"
        aria-label="Choose a profile picture"
      />

      {error && !open && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] text-error">
          <TriangleAlert className="size-4 shrink-0" />
          {error}
        </p>
      )}

      {open && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Crop profile picture"
        >
          <button
            type="button"
            aria-label="Close crop dialog"
            onClick={close}
            disabled={saving}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
          />

          <CropDialogBody saving={saving} error={error} onCancel={close}>
            <div
              ref={viewportRef}
              className={cn(
                "grid h-[340px] w-full place-items-center overflow-auto rounded-xl bg-surface-container-high p-1",
                !ready && "opacity-0"
              )}
            >
              <ImageCrop
                crop={crop}
                onChange={(next) => {
                  cropRef.current = next
                  setCrop(next)
                }}
                onComplete={(next) => {
                  cropRef.current = next
                }}
                aspect={1}
                circularCrop
                className="avatar-cropper"
              >
                {/* A blob: URL cannot go through next/image, and the cropper
                    needs the raw element to read naturalWidth from. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Selected profile picture"
                  onLoad={handleImageLoad}
                  style={
                    baseSize
                      ? { width: baseSize.w * zoom, height: baseSize.h * zoom }
                      : { display: "none" }
                  }
                />
              </ImageCrop>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[13px] leading-[19px] text-on-surface-variant">
                Scroll to zoom, drag to reposition, pull a corner to resize.
              </p>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Zoom out"
                  disabled={!ready || saving || zoom <= MIN_ZOOM}
                  onClick={() => changeZoom(-ZOOM_STEP)}
                >
                  <Minus />
                </Button>
                <span
                  aria-live="polite"
                  className="w-11 text-center font-mono text-[12px] text-on-surface-variant tabular-nums"
                >
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Zoom in"
                  disabled={!ready || saving || zoom >= MAX_ZOOM}
                  onClick={() => changeZoom(ZOOM_STEP)}
                >
                  <Plus />
                </Button>
              </div>
            </div>

            <footer className="mt-5 flex justify-end gap-3 border-t border-outline-variant/20 pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={applyCrop} disabled={saving || !ready}>
                {saving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading
                  </>
                ) : (
                  "Save picture"
                )}
              </Button>
            </footer>
          </CropDialogBody>
        </div>
      )}
    </>
  )
}

/** Shared modal chrome, split out so the cropper markup above stays readable. */
function CropDialogBody({
  saving,
  error,
  onCancel,
  children,
}: {
  saving: boolean
  error: string | null
  onCancel: () => void
  children: React.ReactNode
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onCancel()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [saving, onCancel])

  return (
    <div
      className={cn(
        "relative w-full max-w-[480px] overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl",
        "animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none"
      )}
    >
      <div className="px-6 py-6">
        <h2 className="text-[18px] font-[800] leading-[26px] text-on-surface">Crop profile picture</h2>
        <p className="mt-1 text-[13px] leading-[19px] text-on-surface-variant">
          Your picture is stored in your own folder on the academy server.
        </p>

        <div className="mt-4">{children}</div>

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg bg-error/10 px-3 py-2 text-[13px] leading-[19px] text-error"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

/** Only objects this app wrote live under our bucket prefix, so anything else
 *  (a Google avatar, say) is left untouched. */
function previousObjectPath(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null
  const marker = `/object/public/${BUCKET}/`
  const index = avatarUrl.indexOf(marker)
  if (index === -1) return null
  return avatarUrl.slice(index + `/object/public/`.length)
}
