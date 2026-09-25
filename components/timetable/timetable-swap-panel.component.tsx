"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { ArrowLeftRight, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { cn, getClassroomLabel } from "@/lib/utils.util"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Class } from "@/types/class.type"
import type { BatchAvailabilitySlot } from "@/types/timetable.type"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"

export type TimetableSwapSession = {
  id: string
  batch_id?: string
  class_id?: string
  day_of_week: number
  start_time: string
  end_time: string
  modules: { code: string; title: string } | null
  profiles: { full_name: string } | null
  batches?: { batch_name: string } | null
  classes?: { class_number: string | null; location: string | null } | null
}

interface TimetableSwapPanelProps {
  session: TimetableSwapSession
  sessions?: TimetableSwapSession[]
  classes?: Class[]
  refetchPaths?: string[]
  onClose: () => void
}

interface LoadedBatch {
  key: string
  items: TimetableSwapSession[]
  error: string | null
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

function roomLabel(
  item: Pick<TimetableSwapSession, "class_id" | "classes">,
  classes?: Class[]
) {
  if (item.classes) {
    const classNumber = item.classes.class_number?.trim()
    const location = item.classes.location?.trim()
    if (classNumber && location) return `Class ${classNumber} · ${location}`
    if (classNumber) return `Class ${classNumber}`
    if (location) return location
  }
  return getClassroomLabel(item.class_id, classes)
}

function sessionSubtitle(item: TimetableSwapSession) {
  const teacher = item.profiles?.full_name ?? "—"
  const batch = item.batches?.batch_name
  return batch ? `${teacher} · ${batch}` : teacher
}

export function TimetableSwapPanel({
  session,
  sessions,
  classes,
  refetchPaths,
  onClose,
}: TimetableSwapPanelProps) {
  const pathname = usePathname()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<LoadedBatch | null>(null)

  const batchId = session.batch_id ?? null
  const usesFetch = !sessions && !!batchId

  useEffect(() => {
    if (sessions || !batchId) return

    const key = batchId
    let cancelled = false

    fetch(`/api/timetables/batch/${key}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load the sessions of this batch.")
        return res.json() as Promise<BatchAvailabilitySlot[]>
      })
      .then((items) => {
        if (!cancelled) setLoaded({ key, items, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setLoaded({
            key,
            items: [],
            error: err instanceof Error ? err.message : "Couldn't load the sessions of this batch.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [sessions, batchId])

  const fetchedSessions = usesFetch && loaded?.key === batchId ? loaded.items : null
  const isLoadingSessions = usesFetch && fetchedSessions === null
  const loadError = usesFetch && fetchedSessions !== null ? loaded?.error ?? null : null

  const otherSessions = useMemo(
    () =>
      (fetchedSessions ?? sessions ?? [])
        .filter((item) => item.id !== session.id)
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    [fetchedSessions, sessions, session.id]
  )

  const selected = otherSessions.find((item) => item.id === selectedId) ?? null

  async function onSwap() {
    if (!selected) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/timetables/${session.id}/swap`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ other_id: selected.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while swapping the sessions.")
        return
      }

      await refetchData([pathname, ...(refetchPaths ?? [])])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Swap schedule"
        subtitle={`${session.modules?.code ?? "—"} · ${DAY_OF_WEEK_LABELS[session.day_of_week] ?? "Unknown"} · ${formatTime(session.start_time)}–${formatTime(session.end_time)}`}
        onClose={onClose}
        className="max-w-[560px]"
      >
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Current session
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Pick another session to trade day and time with.
              </p>
            </div>

            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-[14px] font-[600] leading-[20px] text-on-surface">
                  {session.modules?.code ?? "—"} · {session.modules?.title ?? "—"}
                </span>
                <span className="shrink-0 rounded-lg border border-secondary-container/60 bg-primary-fixed/50 px-2.5 py-1 text-[12px] font-[600] leading-[16px] text-on-surface tabular-nums">
                  {DAY_OF_WEEK_LABELS[session.day_of_week] ?? "—"} · {formatTime(session.start_time)}–
                  {formatTime(session.end_time)}
                </span>
              </div>
              <p className="mt-1 truncate text-[12px] leading-[16px] text-on-surface-variant">
                {[sessionSubtitle(session), roomLabel(session, classes)].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Swap with
              </p>

              {loadError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                  {loadError}
                </p>
              )}

              {isLoadingSessions ? (
                <p className="rounded-lg border border-dashed border-outline-variant/30 px-3.5 py-6 text-center text-[13px] leading-[18px] text-on-surface-variant">
                  Loading sessions…
                </p>
              ) : otherSessions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-outline-variant/30 px-3.5 py-6 text-center text-[13px] leading-[18px] text-on-surface-variant">
                  No other sessions in this batch to swap with.
                </p>
              ) : (
                <ul className="space-y-2">
                  {otherSessions.map((item) => {
                    const isSelected = item.id === selectedId
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors",
                            isSelected
                              ? "border-primary/40 bg-primary-fixed/20"
                              : "border-outline-variant/20 bg-surface-container-lowest hover:bg-surface-container"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-[600] leading-[20px] text-on-surface">
                              {item.modules?.code ?? "—"} · {item.modules?.title ?? "—"}
                            </span>
                            <span className="mt-0.5 block truncate text-[12px] leading-[16px] text-on-surface-variant">
                              {[sessionSubtitle(item), roomLabel(item, classes)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="rounded-lg border border-secondary-container/60 bg-primary-fixed/50 px-2.5 py-1 text-[12px] font-[600] leading-[16px] text-on-surface tabular-nums">
                              {DAY_OF_WEEK_LABELS[item.day_of_week] ?? "—"} · {formatTime(item.start_time)}–
                              {formatTime(item.end_time)}
                            </span>
                            <span
                              className={cn(
                                "flex size-5 items-center justify-center rounded-full border transition-colors",
                                isSelected
                                  ? "border-primary bg-primary text-on-primary"
                                  : "border-outline-variant/40 text-transparent"
                              )}
                            >
                              <Check className="size-3" />
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {submitError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {submitError}
              </p>
            )}
          </div>

          <footer className="shrink-0 flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isSubmitting || !selected}
              onClick={() => setShowConfirm(true)}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap
            </Button>
          </footer>
        </div>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Swap these sessions?"
        description={
          selected
            ? `${session.modules?.code ?? "—"} (${DAY_OF_WEEK_LABELS[session.day_of_week] ?? "—"} ${formatTime(
                session.start_time
              )}–${formatTime(session.end_time)}) will trade day and time with ${
                selected.modules?.code ?? "—"
              } (${DAY_OF_WEEK_LABELS[selected.day_of_week] ?? "—"} ${formatTime(
                selected.start_time
              )}–${formatTime(selected.end_time)}).`
            : undefined
        }
        confirmLabel="Swap"
        isSubmitting={isSubmitting}
        onConfirm={() => {
          setShowConfirm(false)
          void onSwap()
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
