import Link from "next/link"

import { RegisteredEventsFeed } from "@/components/events/registered-events-feed.component"

export default async function StudentRegisteredEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1)

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
            Registered events
          </h1>
          <p className="mt-1 text-[14px] text-on-surface-variant">
            Every event you hold a seat for, with the note you left.
          </p>
        </div>

        <Link
          href="/student/announcements"
          className="rounded-full border border-primary/20 px-3.5 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-container"
        >
          Campus wire
        </Link>
      </header>

      <RegisteredEventsFeed role="student" page={currentPage} />
    </div>
  )
}
