/** Time-of-day helpers for the scheduling panels.
 *
 *  Sessions are stored as `HH:MM` strings. The wizard offers the standard
 *  teaching blocks in one combobox rather than two free time pickers, so a
 *  session cannot be created with an end that does not follow its start.
 */

export type TimeOption = { value: string; label: string }
export type TimeSlotOption = TimeOption & { start: string; end: string }

/** `09:00` → `9:00 AM`, for display only. */
export function formatTimeOfDay(value: string): string {
  const [hours, minutes] = value.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`
}

/** The two blocks the academy schedules in. */
export const TIME_SLOT_OPTIONS: TimeSlotOption[] = [
  { value: "09:00-12:00", start: "09:00", end: "12:00", label: "9:00 AM – 12:00 PM" },
  { value: "13:00-16:00", start: "13:00", end: "16:00", label: "1:00 PM – 4:00 PM" },
]

/**
 * Slots for the picker, keeping the session's own times selectable.
 *
 * Existing sessions may predate these blocks, and a combobox whose value is
 * missing from its options renders empty. Appending the current range means an
 * edit still shows what the session is actually scheduled for.
 */
export function timeSlotOptions(start?: string, end?: string): TimeSlotOption[] {
  if (!start || !end) return TIME_SLOT_OPTIONS
  if (TIME_SLOT_OPTIONS.some((slot) => slot.start === start && slot.end === end)) {
    return TIME_SLOT_OPTIONS
  }

  return [
    ...TIME_SLOT_OPTIONS,
    {
      value: `${start}-${end}`,
      start,
      end,
      label: `${formatTimeOfDay(start)} – ${formatTimeOfDay(end)}`,
    },
  ]
}

/** The option value for a start/end pair. */
export function timeSlotValue(start: string, end: string): string {
  return `${start}-${end}`
}
