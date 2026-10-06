import { serverFetch } from "@/lib/server.service"

import StudentAssignmentList from "@/components/students/student-assignment-list.component"
import { sortByUrgency } from "@/lib/assignment.util"
import type { StudentAssignment } from "@/types/student-assignment.type"

export default async function StudentAssignmentsPage() {
  const assignments = ((await serverFetch(
    `http://localhost:3000/api/assignments`,
    // Cookie-scoped per student, so it must never be cached across users.
    { cache: "no-store" }
  ).then((res) => res.json())) ?? []) as StudentAssignment[]

  // Read once here so the countdown cannot drift between render and display.
  const now = new Date()

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">Assignments</h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          Work set for your batches, soonest deadline first.
        </p>
      </header>

      <StudentAssignmentList assignments={sortByUrgency(assignments)} now={now} />
    </div>
  )
}