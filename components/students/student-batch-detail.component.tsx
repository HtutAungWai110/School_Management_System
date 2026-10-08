import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"

import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import BatchRosterList from "@/components/students/batch-roster-list.component"
import type { BatchRosterStudent, StudentBatchDetail } from "@/types/student-batch-detail.type"

function formatDate(value: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

/**
 * How many of the cohort are on each module. Every bar is scaled to the same
 * denominator, the roster size, so a short bar is visibly a gap rather than a
 * different scale.
 */
function buildCoverage(students: BatchRosterStudent[]) {
  const modules = new Map<string, { code: string; title: string; count: number }>()

  for (const student of students) {
    for (const enrollment of student.student_enrollments ?? []) {
      const code = enrollment.modules?.code
      if (!code) continue

      const existing = modules.get(code)
      if (existing) existing.count += 1
      else modules.set(code, { code, title: enrollment.modules?.title ?? "", count: 1 })
    }
  }

  return [...modules.values()].sort((a, b) => a.code.localeCompare(b.code))
}

export default function StudentBatchDetail({ batch }: { batch: StudentBatchDetail }) {
  const students = batch.students ?? []
  const coverage = buildCoverage(students)

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
        <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 p-5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Module coverage
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
            How many of the batch are on each module.
          </p>

          {coverage.length === 0 ? (
            <p className="mt-4 text-[13px] leading-5 text-on-surface-variant">
              No enrolments recorded for this batch yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {coverage.map((module) => (
                <li key={module.code}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[12px] font-medium leading-4 text-on-surface">
                      {module.code}
                    </span>
                    <span className="font-mono text-[11px] leading-4 tabular-nums text-on-surface-variant">
                      {module.count} of {students.length}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(module.count / students.length) * 100}%` }}
                    />
                  </div>
                  {module.title && (
                    <p className="mt-1 truncate text-[12px] leading-4 text-on-surface-variant">
                      {module.title}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <BatchRosterList students={students} />
      </div>
    </div>
  )
}