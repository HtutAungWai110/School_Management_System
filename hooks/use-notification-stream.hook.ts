"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/browser.client"
import {
  getStoredSnapshot,
  persistStored,
  pruneStored,
  toStored,
} from "@/lib/notifications-storage.util"
import { useProfileStore } from "@/components/profile/profile.state"
import type { NotificationRow, StoredNotification } from "@/types/notification.type"

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

type StreamState = {
  toasts: StoredNotification[]
  unreadCount: number
  dismiss: (id: string) => void
  /** Acting on a toast — clicking it — counts as reading it, unlike the plain
   *  dismiss used by the close button and by auto-expiry. */
  markRead: (toast: StoredNotification) => void
  pause: (id: string) => void
  resume: (id: string) => void
}

/**
 * Owns the single notification Realtime channel.
 *
 * Ids are remembered in a Set so the same notification can never be toasted
 * twice — the initial fetch registers what is already pending *without*
 * announcing it, and only genuinely new arrivals produce a toast.
 */
export function useNotificationStream(): StreamState {
  const userId = useProfileStore((state) => state.profile?.id)

  const [toasts, setToasts] = useState<StoredNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const seenRef = useRef(new Set<string>())
  const pendingRef = useRef<StoredNotification[]>([])
  const firstPendingAtRef = useRef<number | null>(null)
  const debounceRef = useRef<number | null>(null)
  const dismissTimersRef = useRef(new Map<string, number>())
  const expiriesRef = useRef(new Map<string, number>())
  const pausedRemainingRef = useRef(new Map<string, number>())
  /* Ids already reported as read, so a toast that is clicked and then expired
     by its timer cannot be counted twice. Separate from `seenRef`, which holds
     every id ever observed and would reject a legitimate click. */
  const readSentRef = useRef(new Set<string>())

  const dismiss = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      dismissTimersRef.current.delete(id)
    }
    expiriesRef.current.delete(id)
    pausedRemainingRef.current.delete(id)
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const arm = useCallback((id: string, delay: number) => {
    const timer = window.setTimeout(() => dismiss(id), delay)
    dismissTimersRef.current.set(id, timer)
    expiriesRef.current.set(id, Date.now() + delay)
  }, [dismiss])

  /**
   * Clicking a toast is an act of reading it, so it takes the same path the
   * notifications page does: written to the local cache, reported to the
   * server, and taken off the unread count. Without this the row would vanish
   * on click but come back unread on the next load.
   */
  const markRead = useCallback(
    (toast: StoredNotification) => {
      dismiss(toast.id)

      if (readSentRef.current.has(toast.id)) return
      readSentRef.current.add(toast.id)

      /* Keep the toast visible on the notifications page afterwards — the API
         only returns unread rows, so the cache is the only place it survives. */
      if (userId) {
        persistStored(userId, pruneStored([toast, ...getStoredSnapshot(userId)]))
      }

      setUnreadCount((count) => Math.max(count - 1, 0))

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [toast.id] }),
        credentials: "include",
      }).catch(() => {
        /* The local cache already reflects this, so a failed request only
           means the row reappears as unread server-side on a later load. */
      })
    },
    [dismiss, userId]
  )

  const flush = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    const batch = pendingRef.current
    pendingRef.current = []
    firstPendingAtRef.current = null
    if (batch.length === 0) return

    const dropped = batch.slice(0, Math.max(batch.length - (MAX_VISIBLE - toasts.length), 0))
    dropped.forEach((toast) => {
      // Timers for anything pushed off the stack would fire against a toast
      // that no longer exists.
      const timer = dismissTimersRef.current.get(toast.id)
      if (timer !== undefined) window.clearTimeout(timer)
      dismissTimersRef.current.delete(toast.id)
    })

    setToasts((prev) => [...prev, ...batch].slice(-MAX_VISIBLE))
    batch.forEach((toast) => arm(toast.id, VISIBLE_MS))
  }, [arm, toasts.length])

  const schedule = useCallback(
    (toast: StoredNotification) => {
      pendingRef.current.push(toast)

      const now = Date.now()
      if (firstPendingAtRef.current === null) firstPendingAtRef.current = now

      if (now - firstPendingAtRef.current >= MAX_WAIT_MS) {
        flush()
        return
      }

      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(flush, DEBOUNCE_MS)
    },
    [flush]
  )

  const handleInsert = useCallback(
    (row: NotificationRow) => {
      // The filter already scopes this to the viewer, but a duplicate delivery
      // (reconnect replay, or a second channel) must not double-toast.
      if (seenRef.current.has(row.id)) return
      seenRef.current.add(row.id)

      const toast = toStored(row)
      if (!toast) return

      setUnreadCount((count) => count + 1)
      schedule(toast)
    },
    [schedule]
  )

  /* Seed: registers the ids that are already pending and sets the count, but
     announces nothing — opening a page with unread work should not fire a toast
     for every one of them. */
  useEffect(() => {
    if (!userId) return

    let cancelled = false

    fetch("/api/notifications?limit=100", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return
        const rows = (json.notifications ?? []) as NotificationRow[]
        rows.forEach((row) => seenRef.current.add(row.id))
        setUnreadCount(json.totalCount ?? rows.length)
      })
      .catch(() => {
        /* A missing count must not break the header; the next insert or a
           visit to /notifications corrects it. */
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => handleInsert(payload.new as NotificationRow)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, handleInsert])

  /* Drop every pending timer on unmount: these outlive a route change otherwise
     and would try to set state on a gone component. The Map identity is fixed
     for the component's lifetime, so capturing it here means the cleanup
     clears the same timers the effect would have registered. */
  useEffect(() => {
    const timers = dismissTimersRef.current

    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const pause = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id)
    if (timer === undefined) return

    window.clearTimeout(timer)
    dismissTimersRef.current.delete(id)

    const expiry = expiriesRef.current.get(id)
    if (expiry !== undefined) {
      pausedRemainingRef.current.set(id, Math.max(expiry - Date.now(), 0))
    }
  }, [])

  const resume = useCallback(
    (id: string) => {
      if (dismissTimersRef.current.has(id)) return

      const remaining = pausedRemainingRef.current.get(id) ?? 0
      pausedRemainingRef.current.delete(id)

      if (remaining <= 0) {
        dismiss(id)
        return
      }
      arm(id, remaining)
    },
    [arm, dismiss]
  )

  return { toasts, unreadCount, dismiss, markRead, pause, resume }
}