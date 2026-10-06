import { serverFetch } from "@/lib/server.service"

import OverviewTimetable from "@/components/students/overview-timetable.component"
import type { OverviewSession } from "@/types/student-overview.type"
import OverviewNextSession from "@/components/students/overview-next-session.component"

export default async function StudentTimetablePage() {
  const rows = (await serverFetch(
    `http://localhost:3000/api/student/timetables`,
    // Cookie-scoped per student, so it must never be cached across users.
    { cache: "no-store" }
  ).then((res) => res.json())) as OverviewSession[]

  /* Normalises the row onto OverviewSession. The classroom columns are nullable
     in the database, so they are flattened to empty strings here rather than
     widening the shared type. */
  const sessions: OverviewSession[] = (rows ?? []).map((row) => ({
    id: row.id,
    batch_id: row.batch_id,
    module_id: row.module_id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status ?? "",
    batches: row.batches,
    modules: row.modules,
    profiles: row.profiles,
    classes: row.classes
      ? { class_number: row.classes.class_number ?? "", location: row.classes.location ?? "" }
      : null,
  }))

  // Read once here so the server and client cannot disagree about the day.
  const now = new Date()

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">Timetable</h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          Every class across your batches, by day and time.
        </p>
      </header>
      <OverviewNextSession sessions={sessions} now={now} />
      <OverviewTimetable sessions={sessions} now={now} />
    </div>
  )
}
