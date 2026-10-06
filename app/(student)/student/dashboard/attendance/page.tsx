import { serverFetch } from "@/lib/server.service"

import StudentAttendanceBatches from "@/components/students/student-attendance-batches.component"
import type { OverviewData } from "@/types/student-overview.type"

export default async function StudentAttendancePage() {
  const overview = (await serverFetch(
    `http://localhost:3000/api/student/overview`,
    // Cookie-scoped per student, so it must never be cached across users.
    { cache: "no-store" }
  ).then((res) => res.json())) as OverviewData

  const batches = overview.assignedBatches ?? []

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">Attendance</h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          Open a batch to see which sessions you attended.
        </p>
      </header>

      <StudentAttendanceBatches batches={batches} />
    </div>
  )
}