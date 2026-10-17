import Link from "next/link"
import { ArrowLeft, CircleHelp } from "lucide-react"

import NotificationFeed from "@/components/notifications/notification-feed.component"

/**
 * Sits outside the role route groups so it has no sidebar; "/" is redirected by
 * the proxy to whichever dashboard the viewer belongs to, which makes it the
 * natural way back.
 *
 * The shell stays a server component; only the feed is client-side, because it
 * reads Supabase directly and subscribes to inserts rather than waiting on an
 * API route.
 *
 * No bell here: the trigger links here, so on this page it would only ever
 * point at itself.
 */
export default function NotificationsPage() {
  return (
    /* No `flex` here: the admin pages use it to sit a single <main> beside a fixed
       sidebar rail, and there is no sidebar on this route. Adding it with a
       header and a main as children puts them side by side instead of stacked,
       which pushed the list off centre. */
    <div className="min-h-screen bg-background">
      <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-4 max-w-[900px] mx-auto md:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-5 text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back to dashboard
          </Link>

          <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
            <CircleHelp className="w-5 h-5" />
            <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-[900px] mx-auto px-6 py-8 md:px-10">
        <h1 className="mb-6 text-[24px] font-bold leading-8 tracking-tight text-primary">
          Notifications
        </h1>
        <NotificationFeed />
      </main>
    </div>
  )
}