"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { batchPages } from "@/lib/batch-pages"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { EnrolledStudent } from "@/types/enrollment.type"
import type { Batch } from "@/types/batch.type"

interface EnrollmentBatchPanelProps {
  student: EnrolledStudent
  onClose: () => void
}

export function EnrollmentBatchPanel({ student, onClose }: EnrollmentBatchPanelProps) {
  const pathname = usePathname()
  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmBatchId, setConfirmBatchId] = useState<string | null>(null)

  const confirmBatch = (batches ?? []).find((batch) => batch.id === confirmBatchId) ?? null

  const studentLevelIds = new Set(
    (student.student_enrollments ?? []).map((e) => e.levels?.id).filter(Boolean)
  )

  useEffect(() => {
    let cancelled = false

    fetch("/api/batches", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load batches")
        return res.json() as Promise<Batch[]>
      })
      .then((data) => {
        if (!cancelled) setBatches(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Something went wrong.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const matchedBatches = (batches ?? []).filter((batch) =>
    (batch.batch_level ?? []).some((bl) => studentLevelIds.has(bl.levels?.id))
  )

  async function assignToBatch(batchId: string) {
    setSubmitError(null)
    setAssigningId(batchId)

    try {
      const res = await fetch(`/api/enrollments/${student.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch_id: batchId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while assigning the student.")
        setAssigningId(null)
        await refetchData(batchPages)
        return
      }

      await refetchData([pathname, ...batchPages])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
      setAssigningId(null)
      await refetchData(batchPages)
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Add to batch"
        subtitle={student.full_name}
        onClose={onClose}
        className="max-w-[560px]"
      >
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
              Matching batches
            </p>
            <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
              Select a batch that covers this student&apos;s enrolled level.
            </p>
          </div>

          {loadError ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {loadError}
            </p>
          ) : batches === null ? (
            <div className="space-y-2">
              {[1, 2].map((n) => (
                <div key={n} className="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-4" />
              ))}
            </div>
          ) : matchedBatches.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/50 px-6 py-10 text-center">
              <Users className="mx-auto size-6 text-on-surface-variant/70" />
              <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">No matching batches</p>
              <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
                No batches cover this student&apos;s enrolled level.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {matchedBatches.map((batch) => (
                <button
                  key={batch.id}
                  type="button"
                  disabled={assigningId !== null}
                  onClick={() => setConfirmBatchId(batch.id)}
                  className="group flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-[700] leading-[20px] text-on-surface">{batch.batch_name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(batch.batch_level ?? []).map((bl) => (
                        <span
                          key={bl.id}
                          className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-2 py-0.5 rounded-md border border-secondary-container/60 text-[11px] font-[600] leading-[16px]"
                        >
                          {bl.levels.description}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-[13px] font-[500] leading-[16px] text-on-surface transition-colors group-hover:border-primary/40"
                    aria-hidden
                  >
                    {assigningId === batch.id ? "Assigning..." : "Assign"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {submitError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
      </ModulesPanelShell>

      <ConfirmDialog
        open={confirmBatchId !== null}
        title="Assign student?"
        description={
          confirmBatch
            ? `Assign ${student.full_name} to "${confirmBatch.batch_name}"?`
            : undefined
        }
        confirmLabel="Assign"
        isSubmitting={assigningId !== null}
        onConfirm={() => {
          if (confirmBatchId) {
            setConfirmBatchId(null)
            assignToBatch(confirmBatchId)
          }
        }}
        onCancel={() => setConfirmBatchId(null)}
      />
    </>
  )
}
