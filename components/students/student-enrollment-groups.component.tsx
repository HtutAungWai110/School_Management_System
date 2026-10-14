import { LEVEL_LABELS } from "@/components/levels/level-utils"
import { type EnrollmentLevelGroup } from "@/lib/enrollment.util"
import type { EnrollmentStatus } from "@/types/enrollment.type"

/** `unassigned` is the default a freshly requested module sits at until an
 *  administrator approves it (which then sets `assigned`), so it reads as
 *  pending here. `assigned` is the normal state for a module you hold, and an
 *  unrecognised value falls through to its own text rather than being
 *  mislabelled as pending — a wrong status is worse than an ugly one. */
const STATUS: Record<EnrollmentStatus, { label: string; pill: string }> = {
  assigned: { label: "Enrolled", pill: "bg-brand-soft text-primary" },
  unassigned: {
    label: "Pending approval",
    pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  completed: {
    label: "Completed",
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
}

const UNKNOWN_STATUS = "bg-surface-container-high text-on-surface-variant"

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function StudentEnrollmentGroups({ groups }: { groups: EnrollmentLevelGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 px-6 py-14 text-center">
        <p className="text-[14px] font-medium leading-5 text-on-surface">
          You aren&apos;t enrolled in any modules yet
        </p>
        <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
          Once you enrol from the levels page, your modules are listed here by level.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section
          key={group.id}
          className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-outline-variant/15 px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                {group.description}
              </h2>
              {group.number && (
                <p className="mt-1 text-[15px] font-semibold leading-6 text-on-surface">
                  {LEVEL_LABELS[group.number] ?? `Level ${group.number}`}
                </p>
              )}
            </div>
            <p className="font-mono text-[12px] leading-4 tabular-nums text-on-surface-variant">
              {group.enrollments.length} module{group.enrollments.length === 1 ? "" : "s"}
            </p>
          </header>

          <ul className="divide-y divide-outline-variant/15">
            {group.enrollments.map((enrollment) => {
              const status = STATUS[enrollment.status] ?? {
                label: enrollment.status,
                pill: UNKNOWN_STATUS,
              }

              return (
                <li
                  key={enrollment.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:gap-6"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 text-primary">
                      {enrollment.module?.code ?? "—"}
                    </span>
                    <span className="truncate text-[14px] font-medium leading-5 text-on-surface">
                      {enrollment.module?.title ?? "Unknown module"}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-[11px] leading-4 text-on-surface-variant">
                      {formatDate(enrollment.enrolledAt)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-4 ${status.pill}`}
                    >
                      {status.label}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
