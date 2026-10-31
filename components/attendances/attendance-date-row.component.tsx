"use client"

import { useState } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils.util"
import { useSessionRoster } from "./use-attendance-data.hook"
import {
  AttendanceStudentTable,
  type AttendanceUpdate,
} from "./attendance-student-table.component"
import type { AttendanceDayCount, AttendanceStudent } from "@/types/attendance.type"

/** A stable identity for the roster's *contents*, so the table re-seeds its
 *  drafts whenever a saved edit comes back different. */
function rosterFingerprint(students: AttendanceStudent[]): string {
  return students
    .map((s) => `${s.id}:${s.status}:${s.remark ?? ""}`)
    .join("|")
}

/**
 * One taught date under a session row.
 *
 * The row renders from the month's counts alone. Its roster — the only part
 * that carries names, emails and phone numbers — is fetched the first time the
 * row is opened, and editing happens against that already-loaded roster.
 */
export function AttendanceDateRow({
  timetableId,
  day,
  onSaved,
}: {
  timetableId: string
  day: AttendanceDayCount
  onSaved: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const roster = useSessionRoster(timetableId, day.date, expanded)

  function toggle() {
    setExpanded((prev) => {
      if (prev) setEditMode(false)
      return !prev
    })
  }

  async function handleSave(updates: AttendanceUpdate[]) {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch("/api/attendances/bulk", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? "Failed to update attendance")
      }
      setEditMode(false)
      roster.reload()
      onSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to update attendance")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "w-full flex items-center gap-3 pl-12 pr-5 py-2.5 text-left transition-colors hover:bg-surface-container-low/30 cursor-pointer",
          expanded && "bg-surface-container-low/20"
        )}
      >
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-on-surface-variant transition-transform duration-200 shrink-0",
            expanded ? "rotate-0" : "-rotate-90"
          )}
        />
        <CalendarDays className="w-3.5 h-3.5 text-on-surface-variant/60 shrink-0" />
        <span className="text-[13px] font-[600] leading-[18px] text-on-surface">
          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] font-[500] leading-[14px] text-on-surface-variant shrink-0">
          {day.late > 0 && <span className="text-yellow-700">{day.late} late</span>}
          {day.absent > 0 && <span className="text-red-600">{day.absent} absent</span>}
          <span>
            {day.present}/{day.total} present
          </span>
        </span>
      </button>

      {expanded && (
        <div className="pb-1">
          {roster.loading ? (
            <div className="pl-12 pr-5 py-3 animate-pulse">
              <div className="h-9 bg-surface-container-high rounded-md" />
            </div>
          ) : roster.error ? (
            <p className="pl-12 pr-5 py-3 text-[12px] leading-[16px] text-destructive">
              {roster.error}
            </p>
          ) : (roster.data?.length ?? 0) === 0 ? (
            <p className="pl-12 pr-5 py-3 text-[12px] leading-[16px] text-on-surface-variant">
              No students recorded for this date.
            </p>
          ) : (
            <>
              {saveError && (
                <p className="pl-12 pr-5 pt-2 text-[12px] leading-[16px] text-destructive">
                  {saveError}
                </p>
              )}
              <AttendanceStudentTable
                /* Re-mount on fresh roster data, not just on edit-mode changes:
                   the table seeds its drafts once, so a saved edit would
                   otherwise leave the old statuses behind. */
                key={rosterFingerprint(roster.data ?? []) + String(editMode)}
                students={roster.data ?? []}
                editMode={editMode}
                saving={saving}
                onEnterEdit={() => setEditMode(true)}
                onCancel={() => setEditMode(false)}
                onSave={handleSave}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
