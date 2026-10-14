"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"

import { createClient } from "@/lib/supabase/browser.client"
import { useProfileStore } from "@/components/profile/profile.state"

/** Above this the exact number stops being meaningful in a 16px pill. */
const MAX_DISPLAYED_COUNT = 9

/**
 * Universal notification trigger. Mounted in the header of every admin page in
 * place of the previous per-page Bell markup.
 *
 * The unread count arrives two ways: once on mount from the API, then
 * incrementally from Realtime, so a notification created by another user shows
 * up without a refresh.
 */
export function NotificationBell() {
  const userId = useProfileStore((state) => state.profile?.id)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    /* limit=1: only the unread total is wanted, not the rows. Every row the
       API returns is unread, so `totalCount` is the unread count. */
    fetch("/api/notifications?limit=1", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setUnreadCount(json.totalCount ?? 0)
      })
      .catch(() => {
        /* A failed count must not break the header; the next Realtime insert
           or a manual visit to the page will correct it. */
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    /* Filtered by recipient so RLS and the filter agree — the stream only ever
       delivers rows this user is already allowed to read. */
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
        () => setUnreadCount((count) => count + 1)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const label = unreadCount > MAX_DISPLAYED_COUNT ? `${MAX_DISPLAYED_COUNT}+` : String(unreadCount)

  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
      }
      className="relative inline-flex items-center text-on-surface-variant transition-colors duration-200 hover:text-primary"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
          {label}
        </span>
      )}
    </Link>
  )
}