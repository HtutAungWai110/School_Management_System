"use client"

import { MousePointerClick } from "lucide-react"

import { cn } from "@/lib/utils.util"
import {
  DAY_OF_WEEK_LABELS,
  type BatchAvailabilitySlot,
  type ClassAvailabilitySlot,
  type TeacherAvailabilitySlot,
} from "@/types/timetable.type"

export const TIME_SLOTS = [
  { label: "9:00 AM – 12:00 PM", start: "09:00", end: "12:00" },
  { label: "1:00 PM – 4:00 PM", start: "13:00", end: "16:00" },
] as const

export type TimeSlot = (typeof TIME_SLOTS)[number]

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

interface TimeSlotGridProps {
  getClassOccupant: (dayOfWeek: number, startTime: string) => ClassAvailabilitySlot | null
  getTeacherOccupant: (dayOfWeek: number, startTime: string) => TeacherAvailabilitySlot | null
  getBatchOccupant: (dayOfWeek: number, startTime: string) => BatchAvailabilitySlot | null
  isSelected: (dayOfWeek: number, startTime: string) => boolean
  onSelectSlot: (dayOfWeek: number, slot: TimeSlot) => void
  originalDayOfWeek?: number
  originalStartTime?: string
}

export function TimeSlotGrid({
  getClassOccupant,
  getTeacherOccupant,
  getBatchOccupant,
  isSelected,
  onSelectSlot,
  originalDayOfWeek,
  originalStartTime,
}: TimeSlotGridProps) {
  return (
    <div className="max-h-[150px] overflow-y-auto rounded-xl border border-outline-variant/15">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low">
          <tr>
            <th className="px-3 py-2.5 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider w-[110px]" />
            {TIME_SLOTS.map((slot) => (
              <th
                key={slot.start}
                className="px-3 py-2.5 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider text-center"
              >
                {slot.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {DAYS.map((day) => (
            <tr key={day} className="divide-x divide-outline-variant/10">
              <td className="px-3 py-2 text-[13px] font-[600] leading-[18px] text-on-surface whitespace-nowrap">
                {DAY_OF_WEEK_LABELS[day]}
              </td>
              {TIME_SLOTS.map((slot) => (
                <td key={slot.start} className="px-1.5 py-1.5">
                  <TimeSlotCell
                    day={day}
                    slot={slot}
                    classOcc={getClassOccupant(day, slot.start)}
                    teacherOcc={getTeacherOccupant(day, slot.start)}
                    batchOcc={getBatchOccupant(day, slot.start)}
                    selected={isSelected(day, slot.start)}
                    original={
                      originalDayOfWeek === day && originalStartTime === slot.start
                    }
                    onSelect={onSelectSlot}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface TimeSlotCellProps {
  day: number
  slot: TimeSlot
  classOcc: ClassAvailabilitySlot | null
  teacherOcc: TeacherAvailabilitySlot | null
  batchOcc: BatchAvailabilitySlot | null
  selected: boolean
  original: boolean
  onSelect: (dayOfWeek: number, slot: TimeSlot) => void
}

function TimeSlotCell({
  day,
  slot,
  classOcc,
  teacherOcc,
  batchOcc,
  selected,
  original,
  onSelect,
}: TimeSlotCellProps) {
  const disabled = !!classOcc || !!teacherOcc || !!batchOcc

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(day, slot)}
      className={cn(
        "w-full rounded-lg px-2.5 py-2 text-left transition-colors",
        disabled
          ? "bg-destructive/5 border border-destructive/15 cursor-not-allowed"
          : original && !selected
            ? "bg-primary/5 border-2 border-primary/40"
            : selected
              ? "bg-primary/10 border-2 border-primary ring-1 ring-primary/20"
              : "bg-surface-container-low/50 border border-outline-variant/10 hover:bg-surface-container-low hover:border-outline-variant/25 cursor-pointer"
      )}
    >
      {disabled && classOcc ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-[600] leading-[14px] text-destructive truncate">
            {classOcc.modules ? `${classOcc.modules.code}` : "Booked"}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {classOcc.modules?.title}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {classOcc.batches?.batch_name}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {classOcc.profiles?.full_name}
          </p>
        </div>
      ) : disabled && teacherOcc ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-[600] leading-[14px] text-destructive truncate">
            {teacherOcc.modules ? `${teacherOcc.modules.code}` : "Teacher busy"}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {teacherOcc.modules?.title}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {teacherOcc.batches?.batch_name}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {teacherOcc.classes?.class_number ? `Class ${teacherOcc.classes.class_number}` : ""}
          </p>
        </div>
      ) : disabled && batchOcc ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-[600] leading-[14px] text-destructive truncate">
            {batchOcc.modules ? `${batchOcc.modules.code}` : "Batch busy"}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {batchOcc.modules?.title}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {batchOcc.profiles?.full_name}
          </p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
            {batchOcc.classes?.class_number ? `Class ${batchOcc.classes.class_number}` : ""}
          </p>
        </div>
      ) : original && !selected ? (
        <div className="space-y-0.5">
          <p className="text-[11px] font-[600] leading-[14px] text-primary/70">Current</p>
          <p className="text-[10px] leading-[13px] text-on-surface-variant">{slot.label}</p>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center gap-1.5",
            selected ? "text-primary" : "text-on-surface-variant"
          )}
        >
          {!selected && <MousePointerClick className="w-3.5 h-3.5 shrink-0" />}
          <p className="text-[12px] font-[500] leading-[16px]">
            {selected ? "Selected" : "Available"}
          </p>
        </div>
      )}
    </button>
  )
}
