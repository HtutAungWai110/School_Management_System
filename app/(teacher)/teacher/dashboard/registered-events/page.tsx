import Link from "next/link"

import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { RegisteredEventsFeed } from "@/components/events/registered-events-feed.component"

export default async function TeacherRegisteredEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1)

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <div>
              <h1 className="text-[24px] font-[600] leading-[32px] text-primary">
                Registered events
              </h1>
              <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
                Every event you hold a seat for, with the note you left.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <Link
                href="/teacher/announcements"
                className="rounded-full border border-primary/20 px-3.5 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-container"
              >
                Campus wire
              </Link>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <RegisteredEventsFeed role="teacher" page={currentPage} />
        </div>
      </main>
    </div>
  )
}
