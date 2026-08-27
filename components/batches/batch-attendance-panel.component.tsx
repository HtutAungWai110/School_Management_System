"use client"

import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  BookOpen,
} from "lucide-react"
import { cn } from "@/lib/utils.util"
import { useAttendanceData } from "./use-attendance-data.hook"
import {
  AttendanceStudentTable,
  type AttendanceUpdate,
} from "./attendance-student-table.component"

function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${ampm}`
}

function computeMonth(d: string | null, fallback: string | null): Date {
  if (d) return new Date(d + "T00:00:00")
  if (fallback) return new Date(fallback + "T00:00:00")
  return new Date()
}

function monthOf(dateStr: string): { year: number; month: number } {
  const d = new Date(dateStr + "T00:00:00")
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function BatchAttendancePanel({ batchId }: { batchId: string }) {
  const { data, date, setDate, loading, error, refresh } =
    useAttendanceData(batchId)

  const sessions = data?.finalData ?? []
  const viewingMonth = computeMonth(date, data?.maxDate ?? null)
  const minMonth = data?.minDate ? monthOf(data.minDate) : null
  const maxMonth = data?.maxDate ? monthOf(data.maxDate) : null

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [editKey, setEditKey] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSaveUpdates(updates: AttendanceUpdate[]) {
    setSaving(true)
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
      refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
      setEditKey(null)
    }
  }

  function toggleSession(sessionId: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  function toggleDate(key: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function goToPrevMonth() {
    const prev = new Date(viewingMonth)
    prev.setMonth(prev.getMonth() - 1)
    setDate(prev.toISOString().split("T")[0])
  }

  function goToNextMonth() {
    const next = new Date(viewingMonth)
    next.setMonth(next.getMonth() + 1)
    setDate(next.toISOString().split("T")[0])
  }

  const canGoPrev =
    minMonth !== null &&
    (viewingMonth.getFullYear() > minMonth.year ||
      viewingMonth.getMonth() > minMonth.month)

  const canGoNext =
    maxMonth !== null &&
    (viewingMonth.getFullYear() < maxMonth.year ||
      viewingMonth.getMonth() < maxMonth.month)

  const monthLabel = viewingMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const startOfMonth = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), 1)
  const endOfMonth = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 0)
  const fmtShort = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const dateRangeLabel = `${fmtShort(startOfMonth)} – ${fmtShort(endOfMonth)}`

  const studentIds = new Set<string>()
  sessions.forEach((s) => {
    Object.values(s.attendances).forEach((arr) => {
      arr.forEach((st) => studentIds.add(st.id))
    })
  })
  const totalStudents = studentIds.size

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="p-6 border-b border-outline-variant/10">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={goToPrevMonth}
            disabled={!canGoPrev || loading}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer disabled:cursor-default"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center flex-1 min-w-0">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4 text-on-surface-variant" />
              <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">
                {monthLabel}
              </h3>
            </div>
            <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
              {dateRangeLabel}
              {sessions.length > 0 && (
                <span className="ml-2 text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[600] leading-[12px] border border-secondary-container/60">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""} ·{" "}
                  {totalStudents} student{totalStudents !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={goToNextMonth}
            disabled={!canGoNext || loading}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer disabled:cursor-default"
            aria-label="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="border border-outline-variant/10 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="px-5 py-3 bg-surface-container-low/50 border-b border-outline-variant/10 flex items-center gap-3">
                  <div className="w-5 h-5 bg-surface-container-high rounded" />
                  <div className="w-16 h-5 bg-surface-container-high rounded-md" />
                  <div className="w-32 h-5 bg-surface-container-high rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[14px] leading-[20px] text-destructive">{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen className="mx-auto size-8 text-on-surface-variant/50" />
            <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">
              No attendance records yet
            </p>
            <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
              Create attendance records from the timetable to start tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {sessions.map((session) => {
              const isSessionExpanded = expandedSessions.has(session.id)
              const dates = Object.keys(session.attendances).sort()

              return (
                <div key={session.id}>
                  {/* Session row (module level) */}
                  <button
                    type="button"
                    onClick={() => toggleSession(session.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container-low/50 cursor-pointer",
                      isSessionExpanded && "bg-surface-container-low/30"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-on-surface-variant transition-transform duration-200 shrink-0",
                        isSessionExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                    <span className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-2 py-0.5 rounded-md border border-secondary-container/60 text-[11px] font-[700] leading-[14px] tracking-wide uppercase shrink-0">
                      {session.modules?.code}
                    </span>
                    <span className="text-[14px] font-[600] leading-[20px] text-on-surface truncate">
                      {session.modules?.title}
                    </span>
                    {session.profiles?.full_name && (
                      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant shrink-0">
                        · {session.profiles.full_name}
                      </span>
                    )}
                    {session.classes?.class_number && (
                      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant shrink-0">
                        · {session.classes.class_number}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] font-[500] leading-[14px] text-on-surface-variant shrink-0">
                      {session.start_time && session.end_time
                        ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`
                        : ""}
                    </span>
                  </button>

                  {/* Expanded: dates */}
                  {isSessionExpanded && (
                    <div>
                      {dates.length === 0 ? (
                        <div className="pl-12 pr-5 py-4 text-[13px] leading-[18px] text-on-surface-variant">
                          No sessions this month.
                        </div>
                      ) : (
                        dates.map((d) => {
                          const dateKey = `${session.id}|${d}`
                          const isDateExpanded = expandedDates.has(dateKey)
                          const students = session.attendances[d] ?? []
                          const presentCount = students.filter(
                            (s) => s.status === "present"
                          ).length

                          const isEditMode = editKey === dateKey

                          return (
                            <div key={d}>
                              {/* Date row */}
                              <button
                                type="button"
                                onClick={() => toggleDate(dateKey)}
                                className={cn(
                                  "w-full flex items-center gap-3 pl-12 pr-5 py-2.5 text-left transition-colors hover:bg-surface-container-low/30 cursor-pointer",
                                  isDateExpanded && "bg-surface-container-low/20"
                                )}
                              >
                                <ChevronDown
                                  className={cn(
                                    "w-3.5 h-3.5 text-on-surface-variant transition-transform duration-200 shrink-0",
                                    isDateExpanded ? "rotate-0" : "-rotate-90"
                                  )}
                                />
                                <CalendarDays className="w-3.5 h-3.5 text-on-surface-variant/60 shrink-0" />
                                <span className="text-[13px] font-[600] leading-[18px] text-on-surface">
                                  {new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "short",
                                  })}
                                </span>
                                <span className="ml-auto text-[11px] font-[500] leading-[14px] text-on-surface-variant shrink-0">
                                  {presentCount}/{students.length} present
                                </span>
                              </button>

                              {isDateExpanded && (
                                <AttendanceStudentTable
                                  key={`${dateKey}-${String(isEditMode)}`}
                                  students={students}
                                  editMode={isEditMode}
                                  saving={saving}
                                  onEnterEdit={() => setEditKey(dateKey)}
                                  onCancel={() => setEditKey(null)}
                                  onSave={(updates) => {
                                    handleSaveUpdates(updates)
                                  }}
                                />
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
