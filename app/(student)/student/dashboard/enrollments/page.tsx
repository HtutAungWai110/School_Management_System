import { serverFetch } from "@/lib/server.service"

import StudentEnrollmentGroups from "@/components/students/student-enrollment-groups.component"
import { groupEnrollmentsByLevel, normaliseEnrollments } from "@/lib/enrollment.util"
import type { StudentEnrollmentRow } from "@/types/student-enrollment.type"

export default async function StudentEnrollmentsPage() {
  const response = await serverFetch(`http://localhost:3000/api/student/enrollments`, {
    // Cookie-scoped per student, so it must never be cached across users.
    cache: "no-store",
  })

  // Checked rather than assumed, so a failed request explains itself instead of
  // rendering as "you are not enrolled in anything".
  if (!response.ok) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
        <header className="mb-6">
          <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
            Enrollments
          </h1>
        </header>
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-6 py-10 text-center">
          <p className="text-[14px] leading-5 text-destructive">
            We couldn&apos;t load your enrolments. Reload the page to try again.
          </p>
        </div>
      </div>
    )
  }

  const body = (await response.json()) as { enrollments?: StudentEnrollmentRow[] | null }
  const groups = groupEnrollmentsByLevel(normaliseEnrollments(body.enrollments ?? []))

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">Enrollments</h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          The modules you&apos;re enrolled on, grouped by level.
        </p>
      </header>

      <StudentEnrollmentGroups groups={groups} />
    </div>
  )
}