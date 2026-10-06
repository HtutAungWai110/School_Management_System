"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useProfileStore } from "@/components/profile/profile.state"
import { useAttendanceData } from "@/components/attendances/use-attendance-data.hook"
import StudentAttendanceCalendar from "./student-attendance-calendar.component"
import StudentAttendanceSummary from "./student-attendance-summary.component"
import { buildMarks, buildRatios, monthIndex, monthLabel, monthParam, parseMonth } from "@/lib/attendance.util"

export default function StudentAttendancePanel({ batchId }: { batchId: string }) {
  const studentId = useProfileStore((state) => state.profile.id)
  const { data, date, setDate, loading, error } = useAttendanceData(batchId)

  // With no explicit date the API answers for the month of its latest record,
  // so the switcher starts there too.
  const anchor = date ?? data?.maxDate ?? null
  const anchorDate = anchor ? parseMonth(anchor) : new Date()
  const year = anchorDate.getFullYear()
  const month = anchorDate.getMonth()

  const current = monthIndex(year, month)
  const earliest = data?.minDate ? toMonthIndex(parseMonth(data.minDate)) : null
  const latest = data?.maxDate ? toMonthIndex(parseMonth(data.maxDate)) : null

  const canGoBack = earliest === null || current > earliest
  const canGoForward = latest === null || current < latest

  const sessions = data?.finalData ?? []
  const marks = buildMarks(sessions, studentId)
  const ratios = buildRatios(sessions, studentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            Month
          </p>
          <p className="mt-0.5 text-[16px] font-semibold leading-6 text-on-surface">
            {monthLabel(year, month)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            disabled={!canGoBack}
            onClick={() => setDate(monthParam(year, month - 1))}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => setDate(monthParam(year, month + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <p className="text-[14px] leading-5 text-on-surface-variant">Loading your attendance…</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3">
          <p className="text-[13px] leading-[19px] text-destructive">{error}</p>
          <p className="mt-1 text-[13px] leading-[19px] text-destructive">
            Close this batch and open it again to retry.
          </p>
        </div>
      ) : ratios.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] font-medium leading-5 text-on-surface">
            No attendance recorded in {monthLabel(year, month)}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
            Pick another month, or ask your teacher to record a session.
          </p>
        </div>
      ) : (
        <>
          <StudentAttendanceCalendar
            year={year}
            month={month}
            today={toTodayKey()}
            marks={marks}
          />

          <div className="border-t border-outline-variant/20 pt-6">
            <StudentAttendanceSummary ratios={ratios} />
          </div>
        </>
      )}
    </div>
  )
}

function toMonthIndex(date: Date) {
  return monthIndex(date.getFullYear(), date.getMonth())
}

/** The calendar highlights today client-side, so the day is read where it
 *  actually rolls over rather than baked into the server render. */
function toTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}