"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Bell, ChevronRight } from "lucide-react"

import {
  byCreatedDesc,
  getEmptySnapshot,
  getStoredSnapshot,
  persistStored,
  pruneStored,
  subscribeStored,
  toStored,
} from "@/lib/notifications-storage.util"
import type {
  NotificationRow,
  NotificationViewItem,
  StoredNotification,
} from "@/types/notification.type"

function relativeTime(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return ""

  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return "just now"

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

function toUnreadItems(rows: NotificationRow[]): NotificationViewItem[] {
  return rows
    .map((row) => {
      const stored = toStored(row)
      return stored ? { ...stored, isRead: false } : null
    })
    .filter((item): item is NotificationViewItem => item !== null)
}

/**
 * Unread-from-API and read-from-localStorage merge into one ordering. An id
 * present in both means a previous mark never reached the database, so the
 * server row wins and the notification shows unread — self-correcting rather
 * than silently trusting a stale local cache.
 *
 * Because both buckets share one sort, moving a row between them as it is
 * viewed leaves it in exactly the same visual position.
 */
function merge(unread: NotificationViewItem[], stored: StoredNotification[]): NotificationViewItem[] {
  const seen = new Set(unread.map((item) => item.id))
  const read: NotificationViewItem[] = stored
    .filter((row) => !seen.has(row.id))
    .map((row) => ({ ...row, isRead: true }))

  return [...unread, ...read].sort(byCreatedDesc)
}

type NotificationListProps = {
  notifications: NotificationRow[]
  userId: string
}

export default function NotificationList({ notifications, userId }: NotificationListProps) {
  const [unread, setUnread] = useState<NotificationViewItem[]>(() => toUnreadItems(notifications))

  /* Read through useSyncExternalStore rather than a useEffect + setState:
     localStorage does not exist during SSR, so the server snapshot is empty and
     the cached rows arrive after hydration without a mismatch. */
  const getSnapshot = useCallback(() => getStoredSnapshot(userId), [userId])
  const stored = useSyncExternalStore(subscribeStored, getSnapshot, getEmptySnapshot)

  const items = merge(unread, stored)
  const unreadCount = unread.length

  const markedRef = useRef(new Set<string>())

  const markRead = useCallback(
    (visibleIds: string[]) => {
      const already = markedRef.current
      const targets = unread.filter(
        (item) => visibleIds.includes(item.id) && !already.has(item.id)
      )
      if (targets.length === 0) return

      targets.forEach((item) => already.add(item.id))
      const movedIds = new Set(targets.map((item) => item.id))

      /* Optimistic: the cache is written and the row leaves the unread bucket
         before the request, so marking never blocks painting. A failed PATCH
         self-corrects — the row simply comes back unread next load. */
      persistStored(
        userId,
        pruneStored([...targets, ...stored])
      )
      setUnread((prev) => prev.filter((item) => !movedIds.has(item.id)))

      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targets.map((item) => item.id) }),
        credentials: "include",
      }).catch(() => {
        /* Already applied optimistically; nothing to roll back. */
      })
    },
    [unread, stored, userId]
  )

  const nodeRefs = useRef(new Map<string, HTMLElement>())
  const observerRef = useRef<IntersectionObserver | null>(null)

  /* Callback ref so rows registered later are still observed and unmounted
     rows are dropped. */
  const setRowRef = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      const map = nodeRefs.current
      const previous = map.get(id)
      if (previous && previous !== node) observerRef.current?.unobserve(previous)

      if (node) {
        node.dataset.notificationId = id
        map.set(id, node)
        observerRef.current?.observe(node)
      } else {
        map.delete(id)
      }
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

        if (ids.length > 0) markRead(ids)
      },
      { threshold: 0 }
    )

    observerRef.current = observer
    nodeRefs.current.forEach((node) => observer.observe(node))

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [markRead])

  return (
    <div className="space-y-2">
      <p className="text-[14px] text-on-surface-variant">
        {unreadCount > 0 ? `${unreadCount} unread` : "Everything here has been read."}
      </p>

      {items.length === 0 ? (
        <div className="rounded-xl border border-primary/10 bg-surface-container-lowest px-6 py-16 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <Bell className="mx-auto size-8 text-on-surface-variant/50" />
          <p className="mt-3 text-[14px] font-semibold leading-5 text-on-surface">
            You&apos;re all caught up
          </p>
          <p className="mt-1 text-[12px] leading-4 text-on-surface-variant">
            New activity will show up here as it happens.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-primary/10 bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
          <ul className="divide-y divide-outline-variant/10">
            {items.map((item) => (
              <li key={item.id} ref={setRowRef(item.id)}>
                <Link
                  href={item.link || "/notifications"}
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface-container-low/50"
                >
                  {/* Decorative: the row is a Link, so this must stay out of
                      the accessible name. */}
                  <span
                    aria-hidden="true"
                    className={`size-2 shrink-0 rounded-full ${item.isRead ? "bg-transparent" : "bg-error"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[14px] leading-5 ${item.isRead ? "text-on-surface-variant" : "font-semibold text-on-surface"}`}
                    >
                      {item.message}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] leading-4 text-on-surface-variant">
                      {relativeTime(item.created_at)}
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
