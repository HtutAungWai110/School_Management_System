"use client"

import { useEffect, useRef, useState } from "react"
import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react"

import type { Batch, BatchTimetable } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import { DAY_OF_WEEK_LABELS, type Timetable } from "@/types/timetable.type"
import { cn } from "@/lib/utils.util"
import { TimetableStatusBadge } from "@/components/timetable/timetable-status-badge.component"
import { TimetableCreateButton } from "@/components/timetable/timetable-create-button.component"
import { TimetableEditPanel } from "@/components/timetable/timetable-edit-panel.component"
import { TimetableDeletePanel } from "@/components/timetable/timetable-delete-panel.component"

function formatTime(time: string) {
  return time.slice(0, 5)
}

function toTimetable(session: BatchTimetable, batch: Batch): Timetable {
  return {
    id: session.id,
    batch_id: batch.id,
    module_id: session.modules?.id ?? "",
    teacher_id: session.profiles?.id ?? "",
    class_id: session.classes?.id ?? "",
    day_of_week: session.day_of_week,
    start_time: session.start_time,
    end_time: session.end_time,
    status: session.status ?? null,
    batches: { id: batch.id, batch_name: batch.batch_name },
    modules: session.modules,
    profiles: session.profiles
      ? { id: session.profiles.id, full_name: session.profiles.full_name }
      : null,
    classes: session.classes,
  }
}

interface BatchTimetableProps {
  batch: Batch
  timetables: BatchTimetable[]
  classes: Class[]
}

export function BatchTimetable({ batch, timetables, classes }: BatchTimetableProps) {
  const timeSlots = [...new Map(
    timetables.map(s => [`${s.start_time}-${s.end_time}`, { start: s.start_time, end: s.end_time }])
  ).values()].sort((a, b) => a.start.localeCompare(b.start));

  const activeDays = [...new Set(timetables.map(s => s.day_of_week))].sort((a, b) => a - b);

  const timetableCellMap = new Map<string, BatchTimetable[]>();
  for (const s of timetables) {
    const key = `${s.day_of_week}_${s.start_time}_${s.end_time}`;
    const arr = timetableCellMap.get(key) ?? [];
    arr.push(s);
    timetableCellMap.set(key, arr);
  }

  return (
    <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center shrink-0">
            <Clock className="w-[18px] h-[18px] text-on-primary-fixed-variant" />
          </div>
          <div>
            <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Timetable</h3>
            <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
              {timetables.length} session{timetables.length === 1 ? "" : "s"} across{" "}
              {activeDays.length} day{activeDays.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <TimetableCreateButton
          batches={[batch]}
          classes={classes}
          fixedBatch={batch}
        />
      </div>
      {timetables.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Clock className="mx-auto size-8 text-on-surface-variant/70" />
          <p className="mt-4 text-[14px] font-[600] leading-[20px] text-on-surface">
            No sessions scheduled yet
          </p>
          <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
            Create the first session for this batch.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse min-w-[560px]">
            <thead>
              <tr className="bg-surface-container-low">
                <th className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider text-left border-b border-r border-outline-variant/10 w-[120px]">
                  Day
                </th>
                {timeSlots.map((ts) => (
                  <th
                    key={`${ts.start}-${ts.end}`}
                    className="px-3 py-3 text-center border-b border-r border-outline-variant/10 last:border-r-0"
                  >
                    <span className="block text-[13px] font-[600] leading-[18px] text-on-surface tabular-nums">
                      {formatTime(ts.start)}–{formatTime(ts.end)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDays.map((day) => (
                <tr key={day}>
                  <td className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 text-[13px] font-[600] leading-[18px] text-on-surface whitespace-nowrap border-r border-b border-outline-variant/10">
                    {DAY_OF_WEEK_LABELS[day]}
                  </td>
                  {timeSlots.map((ts) => {
                    const key = `${day}_${ts.start}_${ts.end}`;
                    const sessions = timetableCellMap.get(key) ?? [];
                    return (
                      <td
                        key={key}
                        className={`px-2 py-2 border-b border-r border-outline-variant/10 last:border-r-0 align-top min-h-[64px] ${
                          sessions.length === 0 ? "bg-surface-container-low/10" : ""
                        }`}
                      >
                        {sessions.length > 0 && (
                          <div className="space-y-1.5">
                            {sessions.map((session) => (
                              <SessionCard
                                key={session.id}
                                session={session}
                                timetable={toTimetable(session, batch)}
                                classes={classes}
                              />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface SessionCardProps {
  session: BatchTimetable
  timetable: Timetable
  classes: Class[]
}

function SessionCard({ session, timetable, classes }: SessionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <>
      <div className="relative rounded-lg bg-primary-fixed/20 border border-secondary-container/40 px-2.5 py-2 group">
        <div className="absolute right-1 top-1 z-10" ref={menuRef}>
          <button
            type="button"
            aria-label="Session actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="cursor-pointer rounded-md p-1 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 min-w-[130px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1">
              {[
                {
                  label: "Edit",
                  icon: Pencil,
                  onClick: () => {
                    setMenuOpen(false)
                    setEditOpen(true)
                  },
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  className: "text-destructive hover:bg-destructive/10",
                  iconClassName: "text-destructive",
                  onClick: () => {
                    setMenuOpen(false)
                    setDeleteOpen(true)
                  },
                },
              ].map(({ label, icon: Icon, className, iconClassName, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className={cn(
                    "w-full flex items-center gap-2 px-3.5 py-2 text-left text-[13px] leading-[18px] hover:bg-surface-container transition-colors",
                    className ?? "text-on-surface"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", iconClassName ?? "text-on-surface-variant")} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-[12px] font-[600] leading-[16px] text-on-surface truncate pr-6">
          {session.modules?.code ?? "—"}
        </p>
        <p className="text-[11px] leading-[14px] text-on-surface-variant truncate">
          {session.modules?.title}
        </p>
        <p className="text-[11px] leading-[14px] text-on-surface-variant truncate">
          {session.profiles?.full_name ?? "—"}
        </p>
        {(session.classes?.class_number || session.classes?.location) && (
          <p className="text-[10px] leading-[13px] text-on-surface-variant/70 truncate">
            {session.classes?.class_number
              ? `Class ${session.classes.class_number}`
              : session.classes?.location}
          </p>
        )}
        <div className="mt-1 flex">
          <TimetableStatusBadge status={session.status ?? null} />
        </div>
      </div>

      {editOpen && (
        <TimetableEditPanel
          timetable={timetable}
          classes={classes}
          onClose={() => setEditOpen(false)}
        />
      )}
      {deleteOpen && (
        <TimetableDeletePanel
          timetable={timetable}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  )
}
