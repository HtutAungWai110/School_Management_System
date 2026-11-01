"use client"

import { Check, DoorOpen, TriangleAlert } from "lucide-react"

import { cn } from "@/lib/utils.util"
import type { Class } from "@/types/class.type"
import type { ClassWindowSlot } from "@/types/timetable.type"

function roomTitle(classItem: Class): string {
  return classItem.class_number?.trim()
    ? `Class ${classItem.class_number.trim()}`
    : "Classroom"
}

function slotSummary(slot: ClassWindowSlot): string {
  const parts = [
    slot.modules ? `${slot.modules.code} · ${slot.modules.title}` : "Session",
    slot.batches?.batch_name,
    slot.profiles?.full_name,
  ].filter(Boolean)

  return parts.join(" · ")
}

/**
 * The final step of the wizard: every room, judged against the day and time
 * chosen above it.
 * A room is either free and selectable, or already holding a session in that
 * window — in which case it is disabled and named, so the reason is visible
 * rather than implied. The room the session currently uses stays selectable in
 * edit mode, because the server excludes the session itself from the conflict
 * check.
 */
export function ClassPicker({
  classes,
  slots,
  value,
  onSelect,
  loading,
  error,
  originalClassId,
  disabled,
}: {
  classes: Class[]
  slots: ClassWindowSlot[]
  value: string
  onSelect: (classId: string) => void
  loading: boolean
  error: string | null
  originalClassId?: string
  disabled?: boolean
}) {
  const occupants = new Map<string, ClassWindowSlot>()
  for (const slot of slots) {
    if (!occupants.has(slot.class_id)) occupants.set(slot.class_id, slot)
  }

  const freeCount = classes.filter((classItem) => !occupants.has(classItem.id)).length

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-[74px] animate-pulse rounded-xl border border-outline-variant/15 bg-surface-container-low/60"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] leading-[18px] text-destructive">
        {error}
      </p>
    )
  }

  if (classes.length === 0) {
    return (
      <p className="rounded-lg border border-outline-variant/15 bg-surface-container-low/40 px-3 py-4 text-center text-[12px] leading-[18px] text-on-surface-variant">
        No classrooms have been added yet.
      </p>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="shrink-0 text-[11px] font-[500] leading-[14px] text-on-surface-variant">
        {freeCount} of {classes.length} classroom{classes.length !== 1 ? "s" : ""} free
        for this slot
      </p>

      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {classes.map((classItem) => {
          const occupant = occupants.get(classItem.id) ?? null
          const selected = classItem.id === value
          const isOriginal = classItem.id === originalClassId
          const location = classItem.location?.trim()

          return (
            <button
              key={classItem.id}
              type="button"
              disabled={!!occupant || disabled}
              onClick={() => onSelect(classItem.id)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition-colors",
                occupant
                  ? "cursor-not-allowed border-destructive/20 bg-destructive/5"
                  : selected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30 cursor-pointer"
                    : "cursor-pointer border-outline-variant/15 bg-surface-container-low/40 hover:border-outline-variant/35 hover:bg-surface-container-low"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-[600] leading-[18px] text-on-surface">
                    {roomTitle(classItem)}
                  </p>
                  <p className="truncate text-[11px] leading-[15px] text-on-surface-variant">
                    {location || "No location set"}
                  </p>
                </div>

                {selected ? (
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="size-3" />
                  </span>
                ) : isOriginal ? (
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-[700] uppercase tracking-[0.08em] text-primary">
                    Current
                  </span>
                ) : occupant ? (
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <DoorOpen className="mt-0.5 size-4 shrink-0 text-on-surface-variant/60" />
                )}
              </div>

              {occupant && (
                <div className="mt-2 space-y-0.5 border-t border-destructive/10 pt-2">
                  <p className="truncate text-[11px] font-[600] leading-[14px] text-destructive">
                    {occupant.start_time.slice(0, 5)} – {occupant.end_time.slice(0, 5)}
                  </p>
                  <p className="truncate text-[11px] leading-[15px] text-on-surface-variant">
                    {slotSummary(occupant)}
                  </p>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** The two non-room collisions that still block the slot. */
export function ScheduleConflicts({
  teacher,
  batch,
}: {
  teacher: ClassWindowSlot | null
  batch: ClassWindowSlot | null
}) {
  if (!teacher && !batch) return null

  return (
    <div className="shrink-0 space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
      {teacher && (
        <p className="text-[12px] leading-[18px] text-destructive">
          The teacher is already scheduled: {slotSummary(teacher)}.
        </p>
      )}
      {batch && (
        <p className="text-[12px] leading-[18px] text-destructive">
          This batch already has a session then: {slotSummary(batch)}.
        </p>
      )}
    </div>
  )
}

