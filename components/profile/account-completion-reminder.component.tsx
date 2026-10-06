"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"
import { useForm, useWatch } from "react-hook-form"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Settings, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useProfileStore } from "@/components/profile/profile.state"
import type { Profile } from "@/types/profile.type"
import { cn } from "@/lib/utils.util"

/** Permanent opt-out. Only written when the user ticks "Don't ask me again",
 *  so this survives a browser restart and is cleared only by clearing storage. */
const OPT_OUT_KEY = "account_completion_opt_out"

/** Which tab session has already been shown the form. Deliberately *not* the
 *  opt-out: this one is meant to expire so the reminder comes back next visit.
 *  Read once per mount, never live — see `shownThisSession` below. */
const SHOWN_KEY = "account_completion_shown"

function readOptOut(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(OPT_OUT_KEY) === "true"
}

function readShownThisSession(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(SHOWN_KEY) === "true"
}

function persistOptOut() {
  localStorage.setItem(OPT_OUT_KEY, "true")
}

/** The opt-out is read live so opting out in one tab hides the sheet in the
 *  others. A no-op server snapshot keeps SSR and hydration in agreement; the
 *  real value arrives on the first client render. */
function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  return () => window.removeEventListener("storage", onStoreChange)
}

function serverSnapshotFalse() {
  return false
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
}

const FIELDS = [
  { name: "date_of_birth", label: "Date of birth" },
  { name: "phone", label: "Phone" },
  { name: "address", label: "Address" },
] as const

const INPUT_CLASS =
  "w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3.5 py-3 text-[14px] leading-5 text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/50 focus:border-primary disabled:opacity-60"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatMemberSince(value: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

type FormValues = { date_of_birth: string; phone: string; address: string }

export function AccountCompletionReminder({ settingsHref }: { settingsHref: string }) {
  const { profile, setProfile } = useProfileStore()
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  const optOut = useSyncExternalStore(subscribeToStorage, readOptOut, serverSnapshotFalse)
  /* Frozen at mount on purpose. This marker exists only to stop a re-mount in
     the same tab from showing the sheet twice; if it were read live, the effect
     that writes it would immediately flip `visible` back to false and the sheet
     would close on itself the instant it opened. */
  const [shownThisSession] = useState(readShownThisSession)
  const [dismissed, setDismissed] = useState(false)
  const [dontAskAgain, setDontAskAgain] = useState(false)
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
    control,
    formState: { isDirty, dirtyFields },
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

  const values = useWatch({ control })
  const filledCount = FIELDS.filter((field) => values[field.name]?.trim()).length
  /** Only fields the user actually touched — this is the change set that gets
   *  written, so it should not claim to include values that were already there. */
  const changes = FIELDS.filter(
    (field) => dirtyFields[field.name] && values[field.name]?.trim()
  )
  const firstEmptyField = FIELDS.find((field) => !values[field.name]?.trim())?.name

  const incomplete = !profile.date_of_birth || !profile.phone || !profile.address
  const visible = !optOut && !shownThisSession && !dismissed && !isSettings && !!profile.id && incomplete

  // Record the showing, not a dismissal. Nothing reads this back during the
  // lifetime of this mount — it is picked up by the next mount, which is what
  // makes it a per-session rather than a live gate.
  useEffect(() => {
    if (!visible || markedRef.current) return
    markedRef.current = true
    sessionStorage.setItem(SHOWN_KEY, "true")
  }, [visible])

  const onDismiss = useCallback(() => {
    if (dontAskAgain) persistOptOut()
    setDismissed(true)
  }, [dontAskAgain])

  // A full-screen takeover has to behave like one: hold the page still behind
  // it, take Escape, and put the cursor in the field the user came to fill.
  useEffect(() => {
    if (!visible) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss()
    }
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [visible, onDismiss])

  useEffect(() => {
    if (!visible) return
    document.querySelector<HTMLElement>("[data-reminder-autofocus]")?.focus()
  }, [visible])

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
        setSubmitError(body?.error ?? "We couldn't save your changes. Check your connection and try again.")
        return
      }

      const result = await res.json()
      setProfile(result.profileData as Profile)
      if (dontAskAgain) persistOptOut()
      setDismissed(true)
    } catch {
      setSubmitError("We couldn't reach the academy server. Check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const role = profile.role?.toLowerCase() ?? ""
  const sheetTransition = { duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] as const }
  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.055, delayChildren: reduceMotion ? 0 : 0.09 } },
  }
  const rise = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] as const } },
  }

  return (
    /* AnimatePresence stays mounted and the condition sits on the child —
       returning null above it would tear the exit animation down with it. */
    <AnimatePresence>
      {visible && (
        <motion.div
          key="account-completion"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-completion-title"
          className="fixed inset-0 z-99 overflow-hidden"
          initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          transition={sheetTransition}
        >
          <div className="relative flex h-full w-full flex-col bg-surface-container-lowest">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              {/* Full-bleed: the column spans the whole sheet, and only the
                  running prose inside it is measure-capped. */}
              <div className="flex min-h-full w-full flex-col px-6 py-7 md:px-10 md:py-9 lg:px-14 lg:py-11 xl:px-20">
                <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-1 flex-col">
                  {/* Identity anchors the top-left corner. The avatar names the
                      record, so no eyebrow is needed above it. */}
                  <motion.div variants={rise} className="flex items-center gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-container font-mono text-[14px] font-semibold text-primary">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt=""
                          width={48}
                          height={48}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        getInitials(profile.full_name ?? "")
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold leading-5 text-on-surface">
                        {profile.full_name}
                      </span>
                      <span className="block truncate text-[13px] leading-5 text-on-surface-variant">
                        {ROLE_LABEL[role] ?? role}
                      </span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                        Member since {formatMemberSince(profile.created_at)}
                      </span>
                    </span>
                  </motion.div>

                  {/* The only structural device left once the panel went, so it
                      gets a full-width band and spans the measure. */}
                  <motion.div
                    variants={rise}
                    className="mt-7 border-t border-outline-variant/30 pt-4"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                        Completion
                      </span>
                      <span className="font-mono text-[13px] leading-4 tabular-nums text-primary">
                        {filledCount} / {FIELDS.length}
                      </span>
                    </div>
                    {/* Reads as one bar filling left to right. Segments are keyed
                        to the count rather than to individual fields, so it never
                        shows a lit gap in the middle. */}
                    <div
                      role="progressbar"
                      aria-label="Profile completion"
                      aria-valuemin={0}
                      aria-valuemax={FIELDS.length}
                      aria-valuenow={filledCount}
                      className="mt-2.5 flex gap-1.5"
                    >
                      {FIELDS.map((field, index) => (
                        <span
                          key={field.name}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            index < filledCount ? "bg-primary" : "bg-outline-variant/40"
                          )}
                        />
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={rise} className="mt-9 space-y-3">
                    <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                      Finish setting up
                    </p>
                    <h1
                      id="account-completion-title"
                      className="max-w-[20ch] text-[30px] font-extrabold leading-[36px] tracking-tight text-primary sm:text-[36px] sm:leading-[42px] lg:text-[44px] lg:leading-[50px]"
                    >
                      Add the details we don&apos;t have yet
                    </h1>
                    <p className="max-w-[64ch] text-[14px] leading-[21px] text-on-surface-variant lg:text-[15px] lg:leading-[23px]">
                      Your date of birth, phone and address are blank. Fill them in so the academy
                      has an accurate record of you.
                    </p>
                  </motion.div>

                  <motion.div variants={rise} className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="reminder-date-of-birth"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
                      >
                        Date of birth
                      </label>
                      <input
                        id="reminder-date-of-birth"
                        type="date"
                        data-reminder-autofocus={firstEmptyField === "date_of_birth" ? "" : undefined}
                        {...register("date_of_birth")}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="reminder-phone"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
                      >
                        Phone
                      </label>
                      <input
                        id="reminder-phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="+44 7700 900123"
                        data-reminder-autofocus={firstEmptyField === "phone" ? "" : undefined}
                        {...register("phone")}
                        className={INPUT_CLASS}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="reminder-address"
                        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-primary"
                      >
                        Address
                      </label>
                      <textarea
                        id="reminder-address"
                        rows={2}
                        placeholder="Street, city, postcode"
                        data-reminder-autofocus={firstEmptyField === "address" ? "" : undefined}
                        {...register("address")}
                        className={cn(INPUT_CLASS, "resize-none")}
                      />
                    </div>
                  </motion.div>

                  {/* The signature: the change set about to be written, in the
                      one face reserved for data. Confirmation, not decoration. */}
                  <motion.div
                    variants={rise}
                    className="mt-7 rounded-xl border border-brand-line/40 bg-brand-soft p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                        Changes to save
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] tabular-nums text-on-surface-variant">
                        {changes.length} {changes.length === 1 ? "change" : "changes"}
                      </p>
                    </div>

                    <AnimatePresence initial={false} mode="popLayout">
                      {changes.length > 0 ? (
                        changes.map((field) => (
                          <motion.div
                            key={field.name}
                            layout
                            initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.25 }}
                            className="mt-3 flex items-baseline gap-3 border-t border-brand-line/40 pt-3 font-mono text-[12px] leading-4"
                          >
                            <span className="font-semibold text-primary">+</span>
                            <span className="text-on-surface-variant">{field.name}</span>
                            <span className="ml-auto truncate text-on-surface">
                              {values[field.name]?.trim()}
                            </span>
                          </motion.div>
                        ))
                      ) : (
                        <motion.p
                          key="no-changes"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="mt-3 border-t border-brand-line/40 pt-3 font-mono text-[12px] leading-4 text-on-surface-variant"
                        >
                          Nothing changed yet.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {submitError && (
                    <p
                      role="alert"
                      className="mt-7 rounded-lg border border-destructive/25 bg-destructive/10 px-3.5 py-3 text-[13px] leading-[19px] text-destructive"
                    >
                      {submitError}
                    </p>
                  )}
                </motion.div>

                <div className="mt-auto flex flex-col-reverse gap-4 border-t border-outline-variant/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2.5 text-[13px] leading-[19px] text-on-surface-variant">
                    <input
                      type="checkbox"
                      checked={dontAskAgain}
                      onChange={(event) => setDontAskAgain(event.target.checked)}
                      className="size-4 accent-primary"
                    />
                    Don&apos;t ask me again
                  </label>

                  <div className="flex items-center gap-2.5">
                    <Link href={settingsHref}>
                      <Button type="button" variant="outline">
                        <Settings />
                        Open settings
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                      {isSubmitting ? "Saving…" : "Save details"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>

            {/* Pinned to the sheet rather than the measure, so the wide white
                field has an anchor opposite the identity block. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={onDismiss}
              className="absolute right-6 top-6 md:right-10 md:top-10"
            >
              <X />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
