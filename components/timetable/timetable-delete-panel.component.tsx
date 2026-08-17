"use client"

import { usePathname } from "next/navigation"

import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { Timetable } from "@/types/timetable.type"
import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"

interface TimetableDeletePanelProps {
  timetable: Timetable
  onClose: () => void
}

function formatTime(time: string) {
  const [h, m] = time.slice(0, 5).split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`
}

export function TimetableDeletePanel({ timetable, onClose }: TimetableDeletePanelProps) {
  const pathname = usePathname()

  const dayLabel = DAY_OF_WEEK_LABELS[timetable.day_of_week] ?? "Unknown"
  const moduleLabel = timetable.modules ? `${timetable.modules.code}` : "this session"
  const timeLabel = `${formatTime(timetable.start_time)} – ${formatTime(timetable.end_time)}`

  async function handleDelete() {
    const res = await fetch(`/api/timetables/${timetable.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while deleting the timetable.")
    }

    await refetchData([pathname, `/admin/dashboard/batches/${timetable.batch_id}`])
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title="Delete session"
      subtitle={`${moduleLabel} · ${dayLabel}`}
      codeChip={moduleLabel}
      heading="Delete this timetable session?"
      description={`This will permanently remove the ${dayLabel} ${timeLabel} session${
        timetable.modules ? ` for ${timetable.modules.title}` : ""
      }. This action cannot be undone.`}
      confirmLabel="Delete session"
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
