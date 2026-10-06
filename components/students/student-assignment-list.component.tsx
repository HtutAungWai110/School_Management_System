import { DEADLINE_STATE, describeDeadline } from "@/lib/assignment.util"
import AssignmentSubmissionSection from "@/components/students/assignment-submission-section.component"
import type { StudentAssignment } from "@/types/student-assignment.type"
import { cn } from "@/lib/utils.util"

/** A backlog is a queue, not a gallery, so this is one hairline-separated list
 *  ordered by deadline rather than a grid of cards. */
export default function StudentAssignmentList({
  assignments,
  now,
}: {
  assignments: StudentAssignment[]
  now: Date
}) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 px-6 py-14 text-center">
        <p className="text-[14px] font-medium leading-5 text-on-surface">No assignments yet</p>
        <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
          When a teacher sets work for your batch, it shows up here.
        </p>
      </div>
    )
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      {assignments.map((assignment) => {
        const deadline = describeDeadline(assignment.deadline_at, now)
        const state = DEADLINE_STATE[deadline.state]

        return (
          <li
            key={assignment.id}
            className={cn(
              "border-b border-l-2 border-outline-variant/15 last:border-b-0",
              state.rail
            )}
          >
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 text-primary">
                    {assignment.modules?.code ?? "—"}
                  </span>
                  <span className="text-[15px] font-medium leading-5 text-on-surface">
                    {assignment.modules?.title ?? "Untitled assignment"}
                  </span>
                </div>

                <p className="mt-1 truncate text-[13px] leading-5 text-on-surface-variant">
                  {assignment.profiles?.full_name ?? "Unassigned"}
                  {assignment.batches?.batch_name && ` · ${assignment.batches.batch_name}`}
                </p>
              </div>

              <div className="shrink-0 sm:text-right">
                <p
                  className={cn(
                    "font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
                    state.text
                  )}
                >
                  {state.label}
                </p>
                <p className="mt-0.5 font-mono text-[13px] leading-4 tabular-nums text-on-surface">
                  {deadline.countdown}
                </p>
                {deadline.stamp && (
                  <p className="font-mono text-[11px] leading-4 text-on-surface-variant">
                    {deadline.stamp}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-outline-variant/10 px-5 py-3">
              <AssignmentSubmissionSection
                assignmentId={assignment.id}
                batchId={assignment.batch_id}
                moduleId={assignment.module_id}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}