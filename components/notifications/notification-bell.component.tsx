"use client"

import Link from "next/link"
import { Bell } from "lucide-react"

import { useNotificationStream } from "@/hooks/use-notification-stream.hook"
import { NotificationToaster } from "@/components/notifications/notification-toaster.component"

/** Above this the exact number stops being meaningful in a 16px pill. */
const MAX_DISPLAYED_COUNT = 9

/**
 * Notification surface mounted in the header of every admin page.
 *
 * It owns the single Realtime channel for the session — the hook handles the
 * unread count, the debounced toast queue and the id de-duplication — and
 * renders both the trigger and the toast stack, so two subscribers never
 * compete for the same insert.
 */
export function NotificationBell() {
  const { toasts, unreadCount, dismiss, markRead, pause, resume } = useNotificationStream()

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
        onRead={markRead}
        onPause={pause}
        onResume={resume}
      />
    </>
  )
}