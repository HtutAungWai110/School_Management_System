"use client"

import { useCallback, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronRight, ListChecks } from "lucide-react"

import { useNotification } from "@/hooks/use-notification.hook"
import { cn } from "@/lib/utils.util"
import type { NotificationViewItem } from "@/hooks/use-notification.hook"

function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""

  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return "Just now"

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`

  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * The notifications page.
 *
 * Client-rendered because it now reads Supabase directly instead of going
 * through an API route. That also removed the need for the localStorage cache
 * that used to stand in for read rows the API would not return — RLS returns
 * everything the viewer owns, read or not, so the database is the only source
 * of truth.
 */
export default function NotificationFeed() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotification()

  const markedRef = useRef(new Set<string>())

  const markVisible = useCallback(
    (ids: string[]) => {
      const already = markedRef.current
      const targets = notifications
        .filter((row) => ids.includes(row.id) && !row.isRead && !already.has(row.id))
        .map((row) => row.id)

      if (targets.length === 0) return

      targets.forEach((id) => already.add(id))
      void markRead(targets)
    },
    [notifications, markRead]
  )

  const setRowRef = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) node.dataset.notificationId = id
    },
    []
  )

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return

    /* threshold 0 fires as soon as any part of a row enters the viewport,
       which is the "visible part on view port" rule: a partly-scrolled row has
       been seen. */
    const observer = new IntersectionObserver(
      (entries) => {
        const ids = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.notificationId)
          .filter((id): id is string => Boolean(id))

        if (ids.length > 0) markVisible(ids)
      },
      { threshold: 0 }
    )

    const nodes = document.querySelectorAll("[data-notification-id]")
    nodes.forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [notifications, markVisible])

  function handleMarkAll() {
    notifications.forEach((row) => markedRef.current.add(row.id))
    void markAllRead()
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-on-surface-variant">
          {unreadCount > 0 ? `${unreadCount} unread` : "Everything here has been read."}
        </p>

        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/30 px-3 py-1.5 text-[12px] font-semibold leading-4 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary",
            unreadCount === 0 && "pointer-events-none opacity-50"
          )}
        >
          <ListChecks className="size-3.5" />
          Mark all read
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-[13px] leading-5 text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-primary/10 bg-surface-container-lowest px-6 py-16 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <p className="text-[13px] leading-5 text-on-surface-variant">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-primary/10 bg-surface-container-lowest px-6 py-16 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <p className="text-[14px] font-semibold leading-5 text-on-surface">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-[12px] leading-4 text-on-surface-variant">
            New activity will show up here as it happens.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-primary/10 bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <ul className="divide-y divide-outline-variant/10">
            {notifications.map((row: NotificationViewItem) => (
              <li key={row.id} ref={setRowRef(row.id)}>
                <Link
                  href={row.link || "/notifications"}
                  onClick={() => markVisible([row.id])}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-container-low/50"
                >
                  {/* Decorative: the row is a Link, so this stays out of the
                      accessible name. */}
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${row.isRead ? "bg-transparent" : "bg-error"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] leading-5 ${row.isRead ? "text-on-surface-variant" : "font-semibold text-on-surface"}`}
                    >
                      {row.message}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] leading-4 text-on-surface-variant">
                      {relativeTime(row.created_at)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-on-surface-variant/60" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}