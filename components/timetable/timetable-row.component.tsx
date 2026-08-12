import { CalendarClock } from "lucide-react"

import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { Timetable } from "@/types/timetable.type"

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function classLabel(timetable: Timetable) {
  const classItem = timetable.classes
  if (!classItem) return "—"
  return classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "—")
}

export function TimetableRow({ timetable }: { timetable: Timetable }) {
  const dayLabel = DAY_OF_WEEK_LABELS[timetable.day_of_week] ?? "Unknown"

  return (
    <tr className="hover:bg-surface-container-low transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed/30 flex items-center justify-center">
            <CalendarClock className="w-5 h-5 text-on-primary-fixed-variant" />
          </div>
          <span className="text-[14px] leading-[20px] font-bold text-on-surface">{dayLabel}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
        {timetable.batches?.batch_name ?? "—"}
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
        {timetable.modules ? (
          <span>
            <span className="font-bold">{timetable.modules.code}</span>
            <span className="text-on-surface-variant"> · {timetable.modules.title}</span>
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
        {timetable.profiles?.full_name ?? "—"}
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">{classLabel(timetable)}</td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
        {formatTime(timetable.start_time)} – {formatTime(timetable.end_time)}
      </td>
    </tr>
  )
}
