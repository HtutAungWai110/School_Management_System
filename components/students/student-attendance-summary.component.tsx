"use client"

import { type ModuleRatio } from "@/lib/attendance.util"

function share(count: number, total: number) {
  return `${(count / total) * 100}%`
}

export default function StudentAttendanceSummary({ ratios }: { ratios: ModuleRatio[] }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          This month
        </h3>
        <p className="text-[12px] leading-4 text-on-surface-variant">
          Present out of sessions held
        </p>
      </div>

      <ul className="mt-3 divide-y divide-outline-variant/15">
        {ratios.map((row) => (
          <li key={row.sessionId} className="py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-medium text-primary">
                    {row.moduleCode}
                  </span>
                  <span className="truncate text-[14px] font-medium leading-5 text-on-surface">
                    {row.moduleTitle}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] leading-4 text-on-surface-variant">
                  {row.dayLabel} {row.time}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="font-mono text-[18px] font-semibold leading-6 tabular-nums text-primary">
                  {row.present}
                </span>
                <span className="font-mono text-[13px] tabular-nums text-on-surface-variant">
                  {" / "}
                  {row.total}
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-3">
              <div
                className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-container-high"
                role="img"
                aria-label={`${row.present} present, ${row.late} late, ${row.absent} absent out of ${row.total} sessions`}
              >
                {row.present > 0 && (
                  <span className="bg-primary" style={{ width: share(row.present, row.total) }} />
                )}
                {row.late > 0 && (
                  <span className="bg-tertiary" style={{ width: share(row.late, row.total) }} />
                )}
                {row.absent > 0 && (
                  <span className="bg-error" style={{ width: share(row.absent, row.total) }} />
                )}
              </div>

              <p className="shrink-0 font-mono text-[11px] leading-4 tabular-nums text-on-surface-variant">
                <span className="text-primary">{row.present} present</span>
                {row.late > 0 && <> · {row.late} late</>}
                {row.absent > 0 && <> · {row.absent} absent</>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}