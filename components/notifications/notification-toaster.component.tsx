"use client"

import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { X } from "lucide-react"

import type { StoredNotification } from "@/types/notification.type"

function eyebrowFor(value: string): string {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000)

  if (!Number.isFinite(seconds) || seconds < 45) return "Just now"

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return `${Math.round(hours / 24)}d ago`
}

type NotificationToasterProps = {
  toasts: StoredNotification[]
  onDismiss: (id: string) => void
  /** Clicking the message is an act of reading it, so it takes a different
   *  path than the close button or auto-expiry. */
  onRead: (toast: StoredNotification) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
}

/**
 * Notifications announce themselves by arriving from the left.
 *
 * The design is a record slip rather than a generic toast: a petrol spine down
 * the leading edge marks it as a system signal (red stays reserved for unread
 * state in the list), and a mono uppercase timestamp sits above the message,
 * matching the code chips and timestamps already used across the console.
 * Everything else is deliberately quiet — one accent, no icons, no shadow
 * beyond enough to read as floating.
 */
export function NotificationToaster({ toasts, onDismiss, onRead, onPause, onResume }: NotificationToasterProps) {
  const reduceMotion = useReducedMotion()

  const fromLeft = reduceMotion ? {} : { x: -28 }
  const settle = { opacity: 1, ...fromLeft }
  const depart = { opacity: 0, ...fromLeft }

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      /* Top-right, just below the sticky page header so the stack never covers
         the bell that raised it, and entirely clear of the fixed admin rail on
         the left. The slide is a short offset from the toast's own left edge,
         not a traverse from the screen edge, so it still reads as arriving from
         the left once anchored here. */
      className="pointer-events-none fixed top-20 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, ...fromLeft }}
            animate={settle}
            exit={depart}
            transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            /* Holding the pointer keeps the toast up long enough to click the
               link inside it; releasing restarts the remaining time. */
            onMouseEnter={() => onPause(toast.id)}
            onMouseLeave={() => onResume(toast.id)}
            className="pointer-events-auto relative overflow-hidden rounded-xl border border-primary/15 bg-surface-container-lowest shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)]"
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary" />

            <div className="flex items-start gap-1 py-3 pl-4 pr-1.5">
              <Link
                href={toast.link || "/notifications"}
                onClick={() => onRead(toast)}
                className="min-w-0 flex-1 cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <p className="font-mono text-[10px] font-medium uppercase leading-[14px] tracking-[0.18em] text-primary">
                  {eyebrowFor(toast.created_at)}
                </p>
                <p className="mt-1 line-clamp-2 text-[14px] font-medium leading-5 text-on-surface">
                  {toast.message}
                </p>
              </Link>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded p-1.5 text-on-surface-variant/50 transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}