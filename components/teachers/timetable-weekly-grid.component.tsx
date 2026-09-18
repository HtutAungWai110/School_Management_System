"use client"

import type { Class } from "@/types/class.type"
import type { TimetableSession } from "./timetable-session-table.component"
import { TimetableSessionCard } from "./timetable-session-card.component"

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]

const MORNING_SLOT = { label: "9:00 AM – 12:00 PM", start: "09:00", end: "12:00" }
const AFTERNOON_SLOT = { label: "1:00 PM – 4:00 PM", start: "13:00", end: "16:00" }

function getTodayDayOfWeek() {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

function getWeekDates(): { dayNum: number; date: number; month: string }[] {
  const now = new Date()
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

interface TimetableWeeklyGridProps {
  sessions: TimetableSession[]
  classes?: Class[]
}

export function TimetableWeeklyGrid({ sessions, classes }: TimetableWeeklyGridProps) {
  const todayDay = getTodayDayOfWeek()
  const weekDates = getWeekDates()

  function getSessionsForCell(dayOfWeek: number, startHour: number) {
    return sessions.filter((s) => {
      if (s.day_of_week !== dayOfWeek) return false
      const h = parseInt(s.start_time.split(":")[0], 10)
      return h >= startHour && h < startHour + 3
    })
  }

  function renderSlotRow(slot: { label: string; start: string; end: string }, period: string) {
    const startHour = parseInt(slot.start.split(":")[0], 10)

    return (
      <tr key={slot.start}>
        <td className="p-3 border-b border-outline-variant/10 align-top">
          <div className="text-[10px] font-[600] leading-[13px] text-on-surface-variant uppercase tracking-wider">
            {slot.label}
          </div>
          <div className="text-[9px] leading-[12px] text-on-surface-variant mt-0.5">
            {period}
          </div>
        </td>
        {DAY_NUMBERS.map((dayNum) => {
          const cellSessions = getSessionsForCell(dayNum, startHour)
          const isToday = dayNum === todayDay

          return (
            <td
              key={dayNum}
              className={`p-1.5 border-b border-outline-variant/10 align-top min-h-[100px] ${
                isToday ? "bg-primary-fixed/5" : ""
              }`}
            >
              <div className="space-y-1.5">
                {cellSessions.map((session) => (
                  <TimetableSessionCard
                    key={session.id}
                    session={session}
                    classes={classes}
                    compact
                  />
                ))}
              </div>
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[800px]" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col className="w-[100px]" />
          {DAY_NUMBERS.map((d) => (
            <col key={d} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="p-3 text-left text-[10px] font-[600] leading-[13px] text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20">
              Time Slot
            </th>
            {weekDates.map(({ dayNum, date, month }) => (
              <th
                key={dayNum}
                className={`p-3 text-center text-[11px] font-[600] leading-[14px] border-b border-outline-variant/20 ${
                  dayNum === todayDay
                    ? "text-primary bg-primary-fixed/10"
                    : "text-on-surface-variant"
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span>{DAY_LABELS[dayNum - 1]}</span>
                  <span className={`text-[16px] font-[700] leading-[20px] ${
                    dayNum === todayDay ? "text-primary" : "text-on-surface"
                  }`}>
                    {date}
                  </span>
                  <span className="text-[9px] font-[400] text-on-surface-variant">{month}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {renderSlotRow(MORNING_SLOT, "Morning")}

          <tr>
            <td className="p-3 border-b border-outline-variant/10 align-top">
              <div className="text-[10px] font-[600] leading-[13px] text-on-surface-variant uppercase tracking-wider">
                12:00 PM – 1:00 PM
              </div>
              <div className="text-[9px] leading-[12px] text-on-surface-variant mt-0.5">
                Break
              </div>
            </td>
            <td
              colSpan={7}
              className="p-3 border-b border-outline-variant/10 bg-surface-container-low/50"
            >
              <p className="text-[11px] font-[500] leading-[14px] text-on-surface-variant text-center">
                Campus Lunch Break & Lab Maintenance
              </p>
            </td>
          </tr>

          {renderSlotRow(AFTERNOON_SLOT, "Afternoon")}
        </tbody>
      </table>
    </div>
  )
}
