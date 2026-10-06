"use client"

import { ATTENDANCE_STATUS, ATTENDANCE_Legend, buildMonthGrid, type AttendanceMark } from "@/lib/attendance.util"
import { cn } from "@/lib/utils.util"

const DAY_HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function StudentAttendanceCalendar({
  year,
  month,
  today,
  marks,
}: {
  year: number
  month: number
  today: string
  marks: Map<string, AttendanceMark[]>
}) {
  const cells = buildMonthGrid(year, month)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-7 border-b border-outline-variant/20">
          {DAY_HEADINGS.map((heading) => (
            <div
              key={heading}
              className="px-2 py-2 text-center font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant"
            >
              {heading}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, index) => {
            if (!cell) {
              return <div key={`pad-${index}`} className="min-h-[88px] bg-surface-container-low/40" />
            }

            const dayMarks = marks.get(cell.date) ?? []
            const isToday = cell.date === today

            return (
              <div
                key={cell.date}
                className={cn(
                  "min-h-[88px] border-b border-r border-outline-variant/15 p-1.5",
                  isToday && "bg-brand-soft/60"
                )}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={cn(
                      "font-mono text-[11px] leading-4 tabular-nums",
                      isToday ? "text-primary" : "text-on-surface-variant",
                      dayMarks.length > 0 && !isToday && "text-on-surface"
                    )}
                  >
                    {cell.day}
                  </span>
                  {isToday && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-primary">
                      Today
                    </span>
                  )}
                </div>

                {/* The signature: one mark per session that day, so a Tuesday
                    with two classes reads as two stacked entries. */}
                <div className="mt-1 space-y-1">
                  {dayMarks.map((mark) => (
                    <div
                      key={`${mark.sessionId}-${cell.date}`}
                      title={`${mark.moduleCode} — ${ATTENDANCE_STATUS[mark.status].label}`}
                      className={cn(
                        "truncate border-l-2 py-0.5 pl-1.5 font-mono text-[10px] leading-[13px]",
                        ATTENDANCE_STATUS[mark.status].mark
                      )}
                    >
                      {mark.moduleCode}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {Object.entries(ATTENDANCE_Legend).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm border-l-2", config.mark)} />
            <span className="text-[12px] leading-4 text-on-surface-variant">{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
