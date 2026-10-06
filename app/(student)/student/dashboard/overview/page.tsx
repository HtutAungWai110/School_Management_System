import { serverFetch } from "@/lib/server.service"
import { GraduationCap } from "lucide-react"

import { MetricCard } from "@/components/admin/metric-card.component"
import OverviewBatches from "@/components/students/overview-batches.component"
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

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <OverviewGreeting now={now} />

      <div className="mb-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <MetricCard
          icon={GraduationCap}
          label="Modules Enrolled"
          value={overview.coursesEnrolledCount ?? 0}
          badge="All time"
          subtitle={
            batches.length === 0
              ? "No batch assigned"
              : `Across ${batches.length} batch${batches.length === 1 ? "" : "es"}`
          }
        />
        <OverviewBatches batches={batches} />
      </div>

      <OverviewNextSession sessions={sessions} now={now} />
      <OverviewTimetable sessions={sessions} now={now} />
    </div>
  )
}