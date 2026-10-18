"use client"

import { useCallback, useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react"

import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import { getModuleColorWithOpacity } from "@/lib/utils.util"
import type { ClassHistoryEntry, ClassHistoryResponse } from "@/types/attendance.type"
import type { Teacher } from "@/types/teacher.type"

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function toLocalDayString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${hour >= 12 ? "PM" : "AM"}`
}

function formatDate(date: string): { weekday: string; label: string } {
  const d = parseLocalDay(date)
  if (!d) return { weekday: "", label: date }
  return {
    weekday: DAY_NAMES[(d.getDay() + 6) % 7] ?? "",
    label: d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
  }
}

interface TeacherClassHistoryPanelProps {
  teacher: Teacher
  onClose: () => void
}

/** The admin's read-only view of one teacher's teaching record.
 *
 *  Fetches on open rather than prefetching with the row: most rows are never
 *  opened, and a teacher with years of history is a much heavier response than
 *  the directory row that points at it. */
export function TeacherClassHistoryPanel({ teacher, onClose }: TeacherClassHistoryPanelProps) {
  /* null = the service decides which month (current if the latest attendance is
     in it, otherwise that latest month). Shifted only once the user navigates. */
  const [month, setMonth] = useState<string | null>(null)

  /* Every outcome is stamped with the request that produced it, so `loading` and
     `error` are derived by comparison rather than reset from inside the effect.
     Setting them there would be a synchronous setState in an effect body, which
     cascades an extra render on every month change. */
  const requestKey = `${teacher.id}|${month ?? ""}`
  const [outcome, setOutcome] = useState<{
    key: string
    data: ClassHistoryResponse | null
    error: string | null
  } | null>(null)

  const loading = outcome?.key !== requestKey
  const error = loading ? null : outcome?.error ?? null
  const data = loading ? null : outcome?.data ?? null

  useEffect(() => {
    let cancelled = false

    const query = month ? `?date=${month}` : ""
    fetch(`/api/teachers/${teacher.id}/class_history${query}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? "Failed to load class history")
        }
        return res.json() as Promise<ClassHistoryResponse>
      })
      .then((res) => {
        if (!cancelled) setOutcome({ key: requestKey, data: res, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setOutcome({
          key: requestKey,
          data: null,
          error: err instanceof Error ? err.message : "Something went wrong.",
        })
      })

    return () => {
      cancelled = true
    }
  }, [teacher.id, month, requestKey])

  const viewing = useCallback(() => (data?.month ? parseLocalDay(data.month) : null) ?? new Date(), [data])

  const minMonth = data?.minDate ? parseLocalDay(data.minDate) : null
  const maxMonth = data?.maxDate ? parseLocalDay(data.maxDate) : null
  const current = viewing()

  const atMin =
    minMonth !== null &&
    (current.getFullYear() < minMonth.getFullYear() ||
      (current.getFullYear() === minMonth.getFullYear() && current.getMonth() <= minMonth.getMonth()))
  const atMax =
    maxMonth !== null &&
    (current.getFullYear() > maxMonth.getFullYear() ||
      (current.getFullYear() === maxMonth.getFullYear() && current.getMonth() >= maxMonth.getMonth()))

  function shift(delta: number) {
    setMonth(toLocalDayString(new Date(current.getFullYear(), current.getMonth() + delta, 1)))
  }

  const monthLabel = current.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const entries = data?.finalData ?? []

  return (
    <ModulesPanelShell
      title="Class history"
      subtitle={teacher.full_name}
      onClose={onClose}
      className="max-w-[860px]"
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Month pager */}
        <div className="flex items-center justify-between gap-4 border-b border-outline-variant/20 px-6 py-3">
          {atMin ? (
            <span className="p-2" aria-hidden="true" />
          ) : (
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shift(-1)}
              disabled={loading}
              className="p-2 rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-40"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0 flex-1 text-center">
            <div className="flex items-center justify-center gap-2">
              <CalendarDays className="w-4 h-4 text-on-surface-variant" />
              <p className="text-[15px] font-[600] leading-[22px] text-on-surface">{monthLabel}</p>
            </div>
            {!loading && !error && (
              <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                {entries.length === 0
                  ? "No classes taught"
                  : `${entries.length} class${entries.length !== 1 ? "es" : ""} taught`}
              </p>
            )}
          </div>

          {atMax ? (
            <span className="p-2" aria-hidden="true" />
          ) : (
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shift(1)}
              disabled={loading}
              className="p-2 rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary disabled:opacity-40"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {error}
            </p>
          ) : loading && !data ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-4"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="mx-auto size-8 text-on-surface-variant/50" />
              <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">
                Nothing taught in {monthLabel}
              </p>
              <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
                A class appears here once attendance is recorded for it.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {entries.map((entry: ClassHistoryEntry) => {
                const session = entry.timetables
                const color = getModuleColorWithOpacity(session?.module_id ?? "", 0.3)
                const { weekday, label } = formatDate(entry.date)

                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <div className="flex w-[110px] shrink-0 flex-col">
                      <span className="text-[11px] font-[500] leading-[14px] uppercase tracking-wider text-on-surface-variant">
                        {weekday}
                      </span>
                      <span className="text-[13px] font-[600] leading-[18px] text-on-surface">{label}</span>
                    </div>

                    <div className="min-w-[160px] flex-1">
                      <span
                        className="inline-block max-w-full truncate rounded px-2 py-0.5 text-[11px] font-[700] uppercase leading-[14px] tracking-wide"
                        style={{ backgroundColor: color }}
                      >
                        {session?.modules?.code ?? "—"}
                      </span>
                      <p className="mt-1 truncate text-[14px] font-[500] leading-[20px] text-on-surface">
                        {session?.modules?.title ?? "Unknown module"}
                      </p>
                    </div>

                    <span className="w-[150px] shrink-0 truncate text-[13px] font-[500] leading-[18px] text-on-surface-variant">
                      {session?.batches?.batch_name ?? "—"}
                    </span>

                    <span className="flex w-[110px] shrink-0 items-center gap-1.5 text-[13px] font-[500] leading-[18px] text-on-surface-variant">
                      <MapPin className="size-3.5 shrink-0" />
                      {session?.classes?.class_number ?? "—"}
                    </span>

                    <span className="w-[140px] shrink-0 text-[13px] font-[500] leading-[18px] text-on-surface-variant">
                      {session ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` : "—"}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </ModulesPanelShell>
  )
}