import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import { createClient } from "@/lib/supabase/server.client"
import NotificationList from "@/components/notifications/notification-list.component"
import type { NotificationRow } from "@/types/notification.type"

interface NotificationsResponse {
  notifications: NotificationRow[];
  totalCount: number;
}

export default async function NotificationsPage() {
  /* no-store: per-user, and changes whenever anything notifies them. */
  const response = await serverFetch(
    `http://localhost:3000/api/notifications?limit=100`,
    { cache: "no-store" }
  )

  /* Checked rather than assumed, so a failed request does not render as
     "you're all caught up" — which would be the opposite of the truth. */
  if (!response.ok) {
    return (
      <div className="mx-auto w-full max-w-[900px] px-6 py-16 md:px-10">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
          Notifications
        </h1>
        <div className="mt-6 rounded-xl border border-destructive/25 bg-destructive/10 px-6 py-12 text-center">
          <p className="text-[14px] leading-5 text-destructive">
            We couldn&apos;t load your notifications. Reload the page to try again.
          </p>
        </div>
      </div>
    )
  }

  const data = (await response.json()) as NotificationsResponse

  /* Passed down rather than read from the profile store: this page sits outside
     the role route groups, so ProfileStoreSync is not mounted here and the
     store would be empty. The list needs the id to namespace its localStorage
     cache, which is what keeps one user's read notifications out of another
     user's list on a shared browser. */
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-8 md:px-10">
      {/* Sits outside the role route groups so it has no sidebar; "/" is
          redirected by the proxy to whichever dashboard the viewer belongs to,
          which makes it the natural way back. */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-5 text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        Back to dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-[24px] font-bold leading-8 tracking-tight text-primary">
        Notifications
      </h1>

      <NotificationList notifications={data?.notifications ?? []} userId={user?.id ?? ""} />
    </div>
  )
}