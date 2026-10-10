import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"

import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import BatchModuleCoverage from "@/components/batches/batch-module-coverage.component"
import BatchRosterList from "@/components/students/batch-roster-list.component"
import type { StudentBatchDetail } from "@/types/student-batch-detail.type"

function formatDate(value: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function StudentBatchDetail({ batch }: { batch: StudentBatchDetail }) {
  const students = batch.students ?? []
  const rosterEnrolments = students.flatMap((student) => student.student_enrollments ?? [])

  return (
    <div>
      <Link
        href="/student/dashboard/batches"
        className="inline-flex items-center gap-1.5 text-[13px] leading-5 text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        All batches
      </Link>

      <div className="mt-4 rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 px-5 py-5 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
              {batch.batch_name}
            </h1>
            <p className="mt-1 text-[14px] leading-5 text-on-surface-variant">
              {batch.levels.join(" · ")}
            </p>
          </div>
          <BatchStatusBadge status={batch.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-outline-variant/15 pt-3">
          <p className="font-mono text-[11px] leading-4 text-on-surface-variant">
            Created {formatDate(batch.created_at)}
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[11px] leading-4 text-on-surface-variant">
            <Users className="size-3.5" />
            {students.length} student{students.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <BatchModuleCoverage enrolments={rosterEnrolments} cohortSize={students.length} />

        <BatchRosterList students={students} />
      </div>
    </div>
  )
}