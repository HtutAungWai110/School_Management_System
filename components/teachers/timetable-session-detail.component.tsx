"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimetableEditPanel } from "./timetable-edit-panel.component"
import { getModuleColorWithOpacity, STATUS_CONFIG, type StatusKey } from "@/lib/utils.util"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { Class } from "@/types/class.type"
import type { TimetableSession } from "./timetable-session-table.component"

interface TimetableSessionDetailProps {
  session: TimetableSession
  classes?: Class[]
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours, 10)
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${minutes} ${period}`
}

export function TimetableSessionDetail({ session, classes }: TimetableSessionDetailProps) {
  const [editOpen, setEditOpen] = useState(false)
  const statusCfg = STATUS_CONFIG[session.status as StatusKey]

  const timeLabel = session.start_time && session.end_time
    ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`
    : "—"

  const dayLabel = session.day_of_week != null
    ? DAY_OF_WEEK_LABELS[session.day_of_week] ?? "Unknown"
    : "—"

  const matchedClass = classes?.find((c) => c.id === session.class_id)

  return (
    <>
      <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span
              className="inline-block text-[14px] font-[700] leading-[16px] tracking-wide px-2 py-0.5 rounded"
              style={{ backgroundColor: getModuleColorWithOpacity(session.module_id, 0.3) }}
            >
              {session.modules.code}
            </span>
            <div>
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">{session.modules.title}</h2>
              <p className="text-[12px] leading-[16px] text-on-surface-variant">
                {session.batches.batch_name} · {session.batches.count} students
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Module</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
                {session.modules.code} · {session.modules.title}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Batch</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
                {session.batches.batch_name}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Teacher</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
                {session.profiles.full_name ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Class</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
                {matchedClass?.class_number ? `Class ${matchedClass.class_number}` : matchedClass?.location ?? "—"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Day</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">{dayLabel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Time</p>
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface">{timeLabel}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Status</p>
              <div className="flex items-center gap-2">
                {statusCfg && (
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: statusCfg.color }} />
                )}
                <span className="text-[14px] font-[500] leading-[20px] text-on-surface capitalize">{session.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen && (
        <TimetableEditPanel
          session={session}
          classes={classes ?? []}
          onClose={() => setEditOpen(false)}
        />
      )}
    </>
  )
}
