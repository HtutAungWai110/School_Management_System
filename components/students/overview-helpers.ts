import type { OverviewSession } from "@/types/student-overview.type"

/** UK convention: day_of_week is 1 = Monday .. 7 = Sunday. */
export const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
}

/** JS getDay is 0 = Sunday, so shift it onto the 1..7 scale above. */
export function todayRqfDay(now: Date) {
  return now.getDay() === 0 ? 7 : now.getDay()
}

export function toMinutes(time: string) {
  const [h = 0, m = 0] = time.split(":")
  return Number(h) * 60 + Number(m)
}

export function formatTime(time: string) {
  return time.slice(0, 5)
}

/** 12-hour clock with meridiem, matching the teacher timetable. */
export function formatTime12(time: string) {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours, 10)
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${minutes} ${period}`
}

export const SHORT_DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
export const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

export function getWeekDates(now: Date) {
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  return DAY_NUMBERS.map((dayNum, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return {
      dayNum,
      date: date.getDate(),
      month: date.toLocaleString("en-US", { month: "short" }),
    }
  })
}

export function durationLabel(session: OverviewSession) {
  const hours = (toMinutes(session.end_time) - toMinutes(session.start_time)) / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

export function roomLabel(session: OverviewSession) {
  return session.classes
    ? [session.classes.class_number, session.classes.location].filter(Boolean).join(" · ")
    : null
}

export function byStartTime(a: OverviewSession, b: OverviewSession) {
  return toMinutes(a.start_time) - toMinutes(b.start_time)
}

export function groupByDay(sessions: OverviewSession[]) {
  const days = new Map<number, OverviewSession[]>()
  for (const session of sessions) {
    days.set(session.day_of_week, [...(days.get(session.day_of_week) ?? []), session])
  }
  return [...days.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, list]) => ({ day, sessions: list.sort(byStartTime) }))
}

export function totalHours(sessions: OverviewSession[]) {
  return sessions.reduce((sum, s) => sum + (toMinutes(s.end_time) - toMinutes(s.start_time)), 0) / 60
}