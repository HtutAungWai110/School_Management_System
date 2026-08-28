"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { CalendarDays, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { AttendanceSession, AttendanceStudent } from "@/types/attendance.type"
import type { BatchTimetable } from "@/types/batch.type"
import { AttendanceStudentTable, type AttendanceUpdate } from "./attendance-student-table.component"

function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

function todayStr(): string {
  const d = new Date()
  return d.toISOString().split("T")[0]
}

type DetailRow = { label: string; value: string }

function Detail({ rows }: { rows: DetailRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            {row.label}
          </p>
          <p className="truncate text-[14px] font-[500] leading-[20px] text-on-surface">
            {row.value}
          </p>
        </div>
      ))}
    </div>
  )
}

interface AttendanceCreatePanelProps {
  session: BatchTimetable
  batchId: string
  batchName: string
  onClose: () => void
}

export function AttendanceCreatePanel({
  session,
  batchId,
  batchName,
  onClose,
}: AttendanceCreatePanelProps) {
  const pathname = usePathname()
  const [date, setDate] = useState<string>(todayStr())
  const [step, setStep] = useState<"form" | "edit">("form")
  const [sessionData, setSessionData] = useState<AttendanceSession | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)

  const timeLabel =
    session.start_time && session.end_time
      ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`
      : "—"

  const detailRows: DetailRow[] = [
    { label: "Batch", value: batchName },
    { label: "Module", value: session.modules?.title ?? "—" },
    {
      label: "Teacher",
      value: session.profiles?.full_name ?? "—",
    },
    {
      label: "Class",
      value: session.classes?.class_number
        ? `Class ${session.classes.class_number}`
        : session.classes?.location ?? "—",
    },
    {
      label: "Day & time",
      value: `${DAY_OF_WEEK_LABELS[session.day_of_week] ?? "—"} · ${timeLabel}`,
    },
  ]

  const students: AttendanceStudent[] = sessionData
    ? (Object.values(sessionData.attendances)[0] ?? [])
    : []

  function createAttendance() {
    setSubmitError(null)
    setCreated(null)
    setCreating(true)

    fetch("/api/attendances", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timetable_id: session.id,
        module_id: session.modules?.id,
        batch_id: batchId,
        date,
      }),
    })
      .then((res) =>
        res.json().then((body) => {
          if (!res.ok) throw new Error(body?.error ?? "Failed to create attendance")
          return body
        })
      )
      .then((body) => {
        setCreated(body.attendance_id)
        return fetch(`/api/attendances/single/${body.attendance_id}`, {
          credentials: "include",
        }).then((res) =>
          res.json().then((data) => {
            if (!res.ok)
              throw new Error(data?.error ?? "Failed to load attendance")
            return data as AttendanceSession
          })
        )
      })
      .then((data) => {
        setSessionData(data)
        setStep("edit")
      })
      .catch((err) => {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong")
      })
      .finally(() => {
        setCreating(false)
      })
  }

  function saveChanges(updates: AttendanceUpdate[]) {
    setSaving(true)
    setSubmitError(null)

    fetch("/api/attendances/bulk", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then((res) =>
        res.json().then((body) => {
          if (!res.ok) throw new Error(body?.error ?? "Failed to save attendance")
        })
      )
      .then(async () => {
        await refetchData([pathname, `/admin/dashboard/batches/${batchId}`])
        onClose()
      })
      .catch((err) => {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong")
      })
      .finally(() => {
        setSaving(false)
      })
  }

  return (
    <>
      <ModulesPanelShell
        title="Create attendance"
        subtitle={
          step === "form"
            ? "Record a new attendance session for this class."
            : "Review and mark each student's attendance."
        }
        codeChip={session.modules?.code}
        onClose={onClose}
        className="max-w-[950px]"
      >
        {step === "form" ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 space-y-5 px-6 py-6">
              <div className="rounded-xl border border-primary/10 bg-surface-container-low/40 p-4">
                <Detail rows={detailRows} />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="attendance-date"
                  className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant"
                >
                  Date
                </label>
                <Input
                  id="attendance-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 w-full"
                />
                <p className="text-[12px] leading-[16px] text-on-surface-variant">
                  The attendance sheet will be created and opened for this date.
                </p>
              </div>

              {submitError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                  {submitError}
                </p>
              )}

              {created && (
                <p className="flex items-center gap-2 rounded-lg border border-green-600/20 bg-green-50 px-3 py-2 text-[13px] leading-[18px] text-green-700">
                  <CheckCircle2 className="size-4" />
                  Attendance created. Opening the sheet…
                </p>
              )}
            </div>

            <footer className="shrink-0 flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
                Cancel
              </Button>
              <Button type="button" disabled={!date || creating} onClick={createAttendance}>
                {creating ? (
                  "Creating..."
                ) : (
                  <>
                    <CalendarDays className="size-4" />
                    Create & Open
                  </>
                )}
              </Button>
            </footer>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
              <div className="rounded-xl border border-primary/10 bg-surface-container-low/40 p-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-[13px] font-[600] leading-[18px] text-on-surface">
                    {session.modules?.title}
                  </span>
                  <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                    {DAY_OF_WEEK_LABELS[session.day_of_week] ?? ""} · {timeLabel}
                  </span>
                  <span className="ml-auto text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                    {date
                      ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              </div>

              {submitError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                  {submitError}
                </p>
              )}

              <AttendanceStudentTable
                students={students}
                editMode
                saving={saving}
                onEnterEdit={() => {}}
                onCancel={onClose}
                onSave={saveChanges}
              />
            </div>
          </div>
        )}
      </ModulesPanelShell>
    </>
  )
}
