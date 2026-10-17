"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { useNotification } from "@/hooks/use-notification.hook"
import { NotificationToaster } from "@/components/notifications/notification-toaster.component"
import type { NotificationToast } from "@/types/notification.type"

/** Above this the exact number stops being meaningful in a 16px pill. */
const MAX_DISPLAYED_COUNT = 9

/** Bursts are coalesced rather than rendered one-per-notification: an admin
 *  approving several enrolments at once should see one settle, not five. */
const DEBOUNCE_MS = 250

/** ...but a trailing debounce alone would starve the UI if notifications kept
 *  arriving, so the first item in a batch is flushed no later than this. */
const MAX_WAIT_MS = 1500

/** How long a toast stays before fading on its own. */
const VISIBLE_MS = 5200

/** Only the newest few are worth holding the corner for. */
const MAX_VISIBLE = 3

/**
 * Notification trigger. Mounted in the header of every admin and teacher page,
 * and once in the student layout.
 *
 * All data comes from `useNotification`, which reads Supabase directly and
 * listens for inserts — so the count moves the moment a row exists rather than
 * on the next poll.
 */
export function NotificationBell() {
  const { incoming, unreadCount, markRead } = useNotification()

  const [toasts, setToasts] = useState<NotificationToast[]>([])

  const pendingRef = useRef<NotificationToast[]>([])
  const firstPendingAtRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)
  const dismissTimersRef = useRef(new Map<string, number>())
  const expiriesRef = useRef(new Map<string, number>())
  const pausedRemainingRef = useRef(new Map<string, number>())
  const readSentRef = useRef(new Set<string>())

  /* Ids already announced. `incoming` is append-only and nothing drains it, so
     tracking ids rather than a count is what stops each insert re-announcing
     every toast still sitting in that array. Matching by id also survives the
     hook trimming the array, which a positional index would not. */
  const queuedRef = useRef(new Set<string>())

  /* Mirrors `toasts` for the overflow calculation in flush(), which runs from a
     timer and so cannot read the latest state from its closure. */
  const toastsRef = useRef<NotificationToast[]>([])
  useEffect(() => {
    toastsRef.current = toasts
  }, [toasts])

  const dismiss = (id: string) => {
    const timer = dismissTimersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      dismissTimersRef.current.delete(id)
    }
    expiriesRef.current.delete(id)
    pausedRemainingRef.current.delete(id)
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const arm = (id: string, delay: number) => {
    const timer = window.setTimeout(() => dismiss(id), delay)
    dismissTimersRef.current.set(id, timer)
    expiriesRef.current.set(id, Date.now() + delay)
  }

  const flush = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const batch = pendingRef.current
    pendingRef.current = []
    firstPendingAtRef.current = null
    if (batch.length === 0) return

    /* Anything pushed off the stack has had its timer cleared, or it would
       fire against a toast that no longer exists. */
    const overflow = Math.max(batch.length - (MAX_VISIBLE - toastsRef.current.length), 0)
    if (overflow > 0) {
      for (const dropped of batch.slice(0, overflow)) {
        const timer = dismissTimersRef.current.get(dropped.id)
        if (timer !== undefined) window.clearTimeout(timer)
        dismissTimersRef.current.delete(dropped.id)
      }
    }

    setToasts((prev) => [...prev, ...batch].slice(-MAX_VISIBLE))
    batch.forEach((toast) => arm(toast.id, VISIBLE_MS))
  }

  useEffect(() => {
    /* Queue only what has not been queued before, not the whole array. */
    const fresh = incoming.filter((toast) => !queuedRef.current.has(toast.id))
    if (fresh.length === 0) return

    fresh.forEach((toast) => queuedRef.current.add(toast.id))
    pendingRef.current = [...pendingRef.current, ...fresh]

    const now = Date.now()
    if (firstPendingAtRef.current === null) firstPendingAtRef.current = now

    if (now - firstPendingAtRef.current >= MAX_WAIT_MS) {
      flush()
      return
    }

    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(flush, DEBOUNCE_MS)
    // `incoming` only ever grows, so this runs once per new batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  /* Drop every pending timer on unmount: these outlive a route change otherwise
     and would try to set state on a component that is gone. */
  useEffect(() => {
    const timers = dismissTimersRef.current
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const pause = (id: string) => {
    const timer = dismissTimersRef.current.get(id)
    if (timer === undefined) return

    window.clearTimeout(timer)
    dismissTimersRef.current.delete(id)

    const expiry = expiriesRef.current.get(id)
    if (expiry !== undefined) {
      pausedRemainingRef.current.set(id, Math.max(expiry - Date.now(), 0))
    }
  }

  const resume = (id: string) => {
    if (dismissTimersRef.current.has(id)) return

    const remaining = pausedRemainingRef.current.get(id) ?? 0
    pausedRemainingRef.current.delete(id)

    if (remaining <= 0) {
      dismiss(id)
      return
    }
    arm(id, remaining)
  }

  /** Clicking a toast is an act of reading it, so it takes the same path as the
   *  notifications page: mark read, drop the badge. */
  const read = (toast: NotificationToast) => {
    dismiss(toast.id)

    if (readSentRef.current.has(toast.id)) return
    readSentRef.current.add(toast.id)
    void markRead([toast.id])
  }

  const label = unreadCount > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(unreadCount)

  return (
    <>
      <Link
        href="/notifications"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative inline-flex items-center text-on-surface-variant transition-colors duration-200 hover:text-primary"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
            {label}
          </span>
        )}
      </Link>

      <NotificationToaster
        toasts={toasts}
        onDismiss={dismiss}
        onRead={read}
        onPause={pause}
        onResume={resume}
      />
    </>
  )
}