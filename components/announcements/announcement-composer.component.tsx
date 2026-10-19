"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ImagePlus, Link2, Loader2, Plus, TriangleAlert, X } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/browser.client"
import { refetchData } from "@/lib/action.action"
import { cn } from "@/lib/utils.util"
import type { Announcement, AnnouncementImage } from "@/types/announcement.type"

const BUCKET = "batch_announcements"
const MAX_IMAGES = 10
const MAX_LINKS = 10
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_CONTENT = 5000

type PendingImage = { id: string; kind: "new"; file: File; preview: string }
type StoredImage = { id: string; kind: "stored"; path: string; url: string; name: string }
type DraftImage = PendingImage | StoredImage
type DraftLink = { id: string; url: string; label: string }

/** Keeps the stored object's extension honest without trusting a filename that
 *  may contain spaces, unicode, or a double extension. */
function extensionFor(file: File) {
  const fromName = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ""
  if (/^\.[a-z0-9]{1,8}$/i.test(fromName)) return fromName.toLowerCase()

  const fromType = file.type.split("/")[1]
  return fromType ? `.${fromType.replace(/[^a-z0-9]/gi, "")}` : ""
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "")
  } catch {
    return value
  }
}

/**
 * Writes an announcement, or edits one when `announcement` is supplied.
 *
 * In edit mode the stored images are sent back with the payload; anything the
 * admin removed is simply absent, and the server deletes those objects from the
 * bucket after the row is saved. Nothing is deleted while the form is open, so
 * cancelling an edit can never destroy an image that is still referenced.
 */
export function AnnouncementComposer({
  batchId,
  batchName,
  announcement,
}: {
  batchId: string
  batchName: string
  announcement?: Announcement
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isEditing = Boolean(announcement)

  /* Object urls are tracked in a ref so every preview is revoked exactly once:
     on removal, and on unmount. A leaked object url keeps the whole file in
     memory for the life of the tab. */
  const objectUrls = useRef<Set<string>>(new Set())

  const [content, setContent] = useState(announcement?.content ?? "")
  const [images, setImages] = useState<DraftImage[]>(() =>
    (announcement?.attachments?.images ?? []).map((image) => ({
      id: image.path,
      kind: "stored" as const,
      path: image.path,
      url: image.url,
      name: image.name,
    }))
  )
  const [links, setLinks] = useState<DraftLink[]>(() =>
    (announcement?.attachments?.links ?? []).map((link, index) => ({
      id: `${link.url}-${index}`,
      url: link.url,
      label: link.label ?? "",
    }))
  )
  const [linkUrl, setLinkUrl] = useState("")
  const [linkLabel, setLinkLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
      urls.clear()
    }
  }, [])

  const listHref = `/admin/dashboard/batches/${batchId}/announcements`
  const isEmpty = !content.trim() && images.length === 0 && links.length === 0

  function addFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return

    const problems: string[] = []
    const accepted: PendingImage[] = []

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        problems.push(`${file.name} is not an image.`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        problems.push(`${file.name} is larger than 10 MB.`)
        continue
      }
      if (images.length + accepted.length >= MAX_IMAGES) {
        problems.push(`You can attach up to ${MAX_IMAGES} images.`)
        break
      }

      const preview = URL.createObjectURL(file)
      objectUrls.current.add(preview)
      accepted.push({ id: crypto.randomUUID(), kind: "new", file, preview })
    }

    if (accepted.length > 0) {
      setImages((previous) => [...previous, ...accepted])
    }
    setError(problems.length > 0 ? problems.join(" ") : null)
  }

  function removeImage(id: string) {
    const target = images.find((image) => image.id === id)
    if (target?.kind === "new") {
      URL.revokeObjectURL(target.preview)
      objectUrls.current.delete(target.preview)
    }
    setImages((previous) => previous.filter((image) => image.id !== id))
  }

  function addLink() {
    const trimmed = linkUrl.trim()
    if (!trimmed) return

    if (links.length >= MAX_LINKS) {
      setError(`You can attach up to ${MAX_LINKS} links.`)
      return
    }

    try {
      const parsed = new URL(trimmed)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported")
    } catch {
      setError("Enter a full link starting with http:// or https://.")
      return
    }

    setLinks((previous) => [
      ...previous,
      { id: crypto.randomUUID(), url: trimmed, label: linkLabel.trim() },
    ])
    setLinkUrl("")
    setLinkLabel("")
    setError(null)
  }

  async function submit() {
    if (isEmpty) {
      setError("Write something or attach at least one link or image.")
      return
    }

    setSaving(true)
    setError(null)

    const supabase = createClient()
    const uploadedPaths: string[] = []

    try {
      /* Upload first, then save the urls. The reverse order would create an
         announcement whose images 404 if any upload failed midway. */
      const uploaded = new Map<string, AnnouncementImage>()

      for (const image of images) {
        if (image.kind !== "new") continue

        const path = `${batchId}/${crypto.randomUUID()}${extensionFor(image.file)}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, image.file, { contentType: image.file.type, upsert: false })

        if (uploadError) throw new Error(uploadError.message)

        uploadedPaths.push(path)
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        uploaded.set(image.id, { url: data.publicUrl, path, name: image.file.name })
      }

      /* Stored images keep their grid position; new ones are not appended to
         the end, so the order the admin arranged is what gets saved. */
      const attachments: AnnouncementImage[] = images.flatMap((image) => {
        if (image.kind === "stored") {
          return [{ url: image.url, path: image.path, name: image.name }]
        }

        const result = uploaded.get(image.id)
        return result ? [result] : []
      })

      const endpoint = announcement
        ? `/api/batches/${batchId}/announcements/${announcement.id}`
        : `/api/batches/${batchId}/announcements`

      const res = await fetch(endpoint, {
        method: announcement ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          attachments: {
            links: links.map((link) => ({ url: link.url, label: link.label || null })),
            images: attachments,
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          body?.error ??
            (announcement
              ? "Could not save the announcement."
              : "Could not publish the announcement.")
        )
      }

      await refetchData([listHref, `/admin/dashboard/batches/${batchId}`])
      router.replace(listHref)
      router.refresh()
    } catch (err) {
      /* Best effort: never leave files in the bucket for an announcement that
         was rejected, but do not let a cleanup failure mask the real error. */
      if (uploadedPaths.length > 0) {
        try {
          await supabase.storage.from(BUCKET).remove(uploadedPaths)
        } catch {
          // ignore
        }
      }

      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="overflow-hidden rounded-2xl border border-t-[3px] border-primary/10 border-t-primary bg-surface-container-lowest shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 px-5 py-4 sm:px-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            {isEditing ? "Edit notice" : "New notice"}
          </p>
          <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
            {isEditing ? "Editing in" : "Posting to"}{" "}
            <span className="font-[700] text-on-surface">{batchName}</span>
          </p>
        </div>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <label htmlFor="announcement-content" className="sr-only">
            Announcement
          </label>
          <Textarea
            id="announcement-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_CONTENT}
            placeholder="What does this batch need to know?"
            className="min-h-[200px] resize-y rounded-xl border-outline-variant/30 bg-surface-container-low/30 px-4 py-3 text-[16px] leading-[26px]"
          />
          <div className="mt-1 flex justify-end">
            <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
              {content.length} / {MAX_CONTENT}
            </span>
          </div>
        </div>

        <div className="border-t border-outline-variant/10 px-5 py-5 sm:px-7 sm:py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Attachments</p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Images */}
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[13px] font-[700] leading-[18px] text-on-surface">
                  <ImagePlus className="size-4 text-on-surface-variant" aria-hidden="true" />
                  Images
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container"
                  >
                    {/* A blob: url cannot go through next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.kind === "new" ? image.preview : image.url}
                      alt={image.kind === "new" ? image.file.name : image.name}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove ${image.kind === "new" ? image.file.name : image.name}`}
                      className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                ))}

                {images.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="grid aspect-square place-items-center rounded-lg border border-dashed border-outline-variant/50 text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary-fixed/20 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <Plus className="size-4" aria-hidden="true" />
                      <span className="text-[10px] font-[600]">Add</span>
                    </span>
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-[16px] text-on-surface-variant">
                PNG, JPG, WebP or AVIF · up to 10 MB each.
              </p>
              {isEditing && (
                <p className="mt-1 text-[11px] leading-[16px] text-on-surface-variant">
                  Removing an image here deletes it from storage when you save.
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={addFiles}
                className="sr-only"
                aria-label="Choose images"
              />
            </section>

            {/* Links */}
            <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-[13px] font-[700] leading-[18px] text-on-surface">
                  <Link2 className="size-4 text-on-surface-variant" aria-hidden="true" />
                  Links
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {links.length}/{MAX_LINKS}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <Input
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addLink()
                    }
                  }}
                  placeholder="https://example.com/resource"
                  inputMode="url"
                  aria-label="Link address"
                />
                <div className="flex gap-2">
                  <Input
                    value={linkLabel}
                    onChange={(event) => setLinkLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addLink()
                      }
                    }}
                    placeholder="Label (optional)"
                    aria-label="Link label"
                    className="min-w-0 flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addLink} disabled={!linkUrl.trim()}>
                    <Plus className="size-4" aria-hidden="true" />
                    Add
                  </Button>
                </div>
              </div>

              {links.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {links.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2.5 py-1.5"
                    >
                      <Link2 className="size-3.5 shrink-0 text-on-surface-variant" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        {link.label && (
                          <p className="truncate text-[12px] font-[600] leading-[16px] text-on-surface">
                            {link.label}
                          </p>
                        )}
                        <p className="truncate text-[11px] leading-[15px] text-on-surface-variant">
                          {hostnameOf(link.url)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinks((previous) => previous.filter((item) => item.id !== link.id))}
                        aria-label={`Remove ${link.label || link.url}`}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-[11px] leading-[16px] text-on-surface-variant">
                Any web address. Give it a label so readers know where it goes.
              </p>
            </section>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mx-5 mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 sm:mx-7"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-[13px] leading-[19px] text-destructive">{error}</p>
          </div>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-outline-variant/10 bg-surface-container-low/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
          <Link
            href={listHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "justify-center px-4")}
          >
            Cancel
          </Link>
          <Button size="lg" className="px-4" onClick={submit} disabled={saving || isEmpty}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {isEditing ? "Saving" : "Publishing"}
              </>
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Publish announcement"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
