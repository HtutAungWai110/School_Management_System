import type { AttendanceStatus, AttendanceStudent } from "@/types/attendance.type"
import type { AttendanceSession } from "@/types/attendance.type"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"

/** A mark is one session the student was meant to attend, on one date.
 *  This is the unit the calendar stacks inside a day cell. */
export type AttendanceMark = {
  sessionId: string
  moduleCode: string
  moduleTitle: string
  startTime: string
  endTime: string
  status: AttendanceStatus
}

/** One recurring session, totalled across the displayed month. */
export type ModuleRatio = {
  sessionId: string
  moduleCode: string
  moduleTitle: string
  dayLabel: string
  time: string
  present: number
  late: number
  absent: number
  total: number
}

/** Three states a mark can take. Each maps to an existing token so the colours
 *  follow the theme: petrol for present, violet for late, danger for absent. */
export const ATTENDANCE_STATUS = {
  present: { label: "Present", mark: "bg-brand-soft text-primary border-l-primary" },
  late: { label: "Late", mark: "bg-tertiary/10 text-tertiary border-l-tertiary" },
  absent: { label: "Absent", mark: "bg-error/10 text-error border-l-error" },
} as const

export const ATTENDANCE_Legend = {
  present: { label: "Present", mark: "bg-primary text-primary border-primary" },
  late: { label: "Late", mark: "bg-tertiary text-tertiary border-tertiary" },
  absent: { label: "Absent", mark: "bg-error text-error border-error" },
} as const

/** 24-hour, matching the register convention used elsewhere in attendance. */
export function formatClock(time: string) {
  return time.slice(0, 5)
}

/** "2026-10" — the prefix every date key in the payload shares. */
export function monthKeyOf(date: string) {
  return date.slice(0, 7)
}

export function monthParam(year: number, month: number) {
  const normalised = new Date(year, month, 1)
  return `${normalised.getFullYear()}-${String(normalised.getMonth() + 1).padStart(2, "0")}-01`
}

/** Months are compared as a single number so the stepper can bound itself
 *  against minDate and maxDate without comparing Date objects. */
export function monthIndex(year: number, month: number) {
  return year * 12 + month
}

export function parseMonth(date: string) {
  return new Date(`${date}T00:00:00`)
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

/** The API hands back the whole cohort, so only this student's row counts. */
function ownRecord(students: AttendanceStudent[], studentId: string) {
  if (!studentId) return undefined
  return (students ?? []).find((student) => student.student_id === studentId)
}

/** Monday-first, because day_of_week runs 1 = Monday .. 7 = Sunday. Returns
 *  nulls for the leading and trailing days so the grid stays rectangular. */
export function buildMonthGrid(year: number, month: number) {
  const jsFirstDay = new Date(year, month, 1).getDay()
  const leading = (jsFirstDay === 0 ? 7 : jsFirstDay) - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ date: string; day: number } | null> = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    cells.push({ date, day })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/** Every mark in the payload, keyed by date and ordered by start time. */
export function buildMarks(sessions: AttendanceSession[], studentId: string) {
  const byDate = new Map<string, AttendanceMark[]>()

  for (const session of sessions) {
    for (const [date, students] of Object.entries(session.attendances ?? {})) {
      const own = ownRecord(students, studentId)
      if (!own) continue

      const mark: AttendanceMark = {
        sessionId: session.id,
        moduleCode: session.modules?.code ?? "—",
        moduleTitle: session.modules?.title ?? "Untitled module",
        startTime: session.start_time,
        endTime: session.end_time,
        status: own.status,
      }
      byDate.set(date, [...(byDate.get(date) ?? []), mark])
    }
  }

  for (const [date, marks] of byDate) {
    byDate.set(date, [...marks].sort((a, b) => a.startTime.localeCompare(b.startTime)))
  }

  return byDate
}

/** Per-session totals for the month the API just returned. Sessions with no
 *  recorded mark for this student are dropped rather than shown as zero. */
export function buildRatios(sessions: AttendanceSession[], studentId: string): ModuleRatio[] {
  return sessions
    .map((session) => {
      let present = 0
      let late = 0
      let absent = 0

      for (const students of Object.values(session.attendances ?? {})) {
        const own = ownRecord(students, studentId)
        if (!own) continue
        if (own.status === "present") present += 1
        else if (own.status === "late") late += 1
        else absent += 1
      }

      return {
        sessionId: session.id,
        moduleCode: session.modules?.code ?? "—",
        moduleTitle: session.modules?.title ?? "Untitled module",
        dayLabel: DAY_OF_WEEK_LABELS[session.day_of_week] ?? "—",
        time: `${formatClock(session.start_time)}–${formatClock(session.end_time)}`,
        present,
        late,
        absent,
        total: present + late + absent,
      }
    })
    .filter((row) => row.total > 0)
}
