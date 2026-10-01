import { serverFetch } from "@/lib/server.service"
import { GraduationCap, Layers } from "lucide-react"

import OverviewGreeting from "@/components/students/overview-greeting.component"
import OverviewNextSession from "@/components/students/overview-next-session.component"
import OverviewTimetable from "@/components/students/overview-timetable.component"
import type { OverviewData, OverviewSession } from "@/types/student-overview.type"

export default async function OverviewPage() {
  const overview = (await serverFetch(
    `http://localhost:3000/api/student/overview`,
    // Cookie-scoped per student, so it must never be cached across users.
    { cache: "no-store" }
  ).then((res) => res.json())) as OverviewData

  const batches = overview.assignedBatches ?? []
  const batchIds = new Set(batches.map((batch) => batch.id))
  const sessions: OverviewSession[] = (overview.timetableData ?? []).filter((session) =>
    batchIds.has(session.batch_id)
  )

  // Read once here so the server and client cannot disagree about the day.
  const now = new Date()
  const activeBatch = batches.find((batch) => batch.status === "ongoing")

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <OverviewGreeting now={now} batchName={activeBatch?.batch_name ?? "No batch assigned"} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 text-[12px] font-medium text-on-primary-container">
          <GraduationCap className="size-3.5" />
          {overview.coursesEnrolledCount ?? 0} modules enrolled
        </span>
        {batches.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-medium text-primary">
            <Layers className="size-3.5" />
            {batches.length} batch{batches.length === 1 ? "" : "es"}
          </span>
        )}
      </div>

      <OverviewNextSession sessions={sessions} now={now} />
      <OverviewTimetable sessions={sessions} now={now} />
    </div>
  )
}