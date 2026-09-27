"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { Settings, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useProfileStore } from "@/components/profile/profile.state"
import type { Profile } from "@/types/profile.type"

const DISMISS_KEY = "account_completion_dismissed"

function isDismissed(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(DISMISS_KEY) === "true"
}

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction >= 0 ? 64 : -64, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -64 : 64, opacity: 0, scale: 0.97 }),
}

type FormValues = { date_of_birth: string; phone: string; address: string }

export function AccountCompletionReminder({ settingsHref }: { settingsHref: string }) {
  const { profile, setProfile } = useProfileStore()
  const pathname = usePathname()
  const [dismissed, setDismissed] = useState(isDismissed)
  const [dontAskAgain, setDontAskAgain] = useState(false)
  const [direction, setDirection] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const markedRef = useRef(false)

  const isSettings =
    pathname === "/student/dashboard/settings" ||
    pathname === "/teacher/dashboard/settings"

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: { date_of_birth: "", phone: "", address: "" },
  })

  useEffect(() => {
    if (profile.id) {
      reset({
        date_of_birth: profile.date_of_birth ?? "",
        phone: profile.phone ?? "",
        address: profile.address ?? "",
      })
    }
  }, [profile, reset])

  // Mark as shown once this session so re-mounts (navigation) don't re-show it.
  useEffect(() => {
    if (!dismissed && !isSettings && profile.id && !markedRef.current) {
      markedRef.current = true
      sessionStorage.setItem(DISMISS_KEY, "true")
    }
  }, [dismissed, isSettings, profile.id])

  const visible = !dismissed && !isSettings && !!profile.id && (!profile.date_of_birth || !profile.phone || !profile.address)

  function onDismiss() {
    if (dontAskAgain) sessionStorage.setItem(DISMISS_KEY, "true")
    setDirection(-1)
    setDismissed(true)
  }

  async function onSubmit(data: FormValues) {
    if (!profile.id) return
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/profile/${profile.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while updating your profile.")
        return
      }

      const result = await res.json()
      setProfile(result.profileData as Profile)
      if (dontAskAgain) sessionStorage.setItem(DISMISS_KEY, "true")
      setDirection(-1)
      setDismissed(true)
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        custom={direction}
        variants={SLIDE_VARIANTS}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
          <div className="flex items-center justify-between px-6 pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-[18px] font-[800] leading-[26px] text-on-surface">
                  Complete your account
                </h2>
                <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                  Add your date of birth, phone, and address.
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-6 py-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-[500] leading-[14px] text-on-surface-variant">
                Date of birth
              </label>
              <input
                type="date"
                {...register("date_of_birth")}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-[14px] leading-[20px] text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-[500] leading-[14px] text-on-surface-variant">
                Phone
              </label>
              <input
                type="text"
                {...register("phone")}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-[14px] leading-[20px] text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-[500] leading-[14px] text-on-surface-variant">
                Address
              </label>
              <input
                type="text"
                {...register("address")}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-[14px] leading-[20px] text-on-surface outline-none focus:border-primary"
              />
            </div>

            {submitError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {submitError}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-[13px] leading-[18px] text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={dontAskAgain}
                  onChange={(e) => setDontAskAgain(e.target.checked)}
                  className="size-4 accent-primary"
                />
                Don&apos;t ask me again
              </label>

              <div className="flex items-center gap-2">
                <Link href={settingsHref}>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </Link>
                <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
