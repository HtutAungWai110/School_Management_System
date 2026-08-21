"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { cn } from "@/lib/utils.util"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { EnrolledStudent } from "@/types/enrollment.type"
import type { Batch } from "@/types/batch.type"

interface EnrollmentBulkBatchPanelProps {
  students: EnrolledStudent[]
  onClose: () => void
}

export function EnrollmentBulkBatchPanel({ students, onClose }: EnrollmentBulkBatchPanelProps) {
  const pathname = usePathname()
  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [assigningBatchId, setAssigningBatchId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmBatchId, setConfirmBatchId] = useState<string | null>(null)

  const confirmBatch = (batches ?? []).find((batch) => batch.id === confirmBatchId) ?? null

  const studentIds = [...new Set(students.map((s) => s.id))]

  const commonLevelIds = (() => {
    const levelSets = students.map(
      (s) => new Set((s.student_enrollments ?? []).map((e) => e.levels?.id).filter(Boolean))
    );
    if (levelSets.length === 0) return [];
    return [...levelSets[0]].filter((id) => levelSets.every((set) => set.has(id)));
  })()

  const commonLevelSet = new Set(commonLevelIds)

  const matchedBatches = (batches ?? []).filter((batch) =>
    (batch.batch_level ?? []).some((bl) => commonLevelSet.has(bl.levels?.id))
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

  async function assignToBatch(batchId: string) {
    setSubmitError(null)
    setAssigningBatchId(batchId)

    const studentModuleMap: Record<string, string[]> = {}
    for (const student of students) {
      const moduleIds = (student.student_enrollments ?? [])
        .filter((e) => e.status === "unassigned")
        .map((e) => e.modules?.id)
        .filter(Boolean) as string[]
      if (moduleIds.length > 0) {
        studentModuleMap[student.id] = moduleIds
      }
    }

    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: studentIds, batch_id: batchId, student_module_map: studentModuleMap }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while assigning the students.")
        setAssigningBatchId(null)
        await refetchData("/admin/dashboard/batches")
        return
      }

      await refetchData([pathname, `/admin/dashboard/batches/${batchId}`, "/admin/dashboard/batches"])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
      setAssigningBatchId(null)
      await refetchData("/admin/dashboard/batches")
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Assign to batch"
        subtitle={`${students.length} ${students.length === 1 ? "student" : "students"}`}
        onClose={onClose}
        className="max-w-[560px]"
      >
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Shared level match
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Pick a batch that covers every selected student&apos;s level.
              </p>
            </div>

            {loadError ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {loadError}
              </p>
            ) : commonLevelIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/50 px-6 py-10 text-center">
                <Users className="mx-auto size-6 text-on-surface-variant/70" />
                <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">No shared level</p>
                <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
                  These students don&apos;t share an enrolled level, so no batch can cover all of them.
                </p>
              </div>
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
                  No batch covers the level these students share.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchedBatches.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    disabled={assigningBatchId !== null}
                    onClick={() => setConfirmBatchId(batch.id)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4 text-left transition-colors hover:border-primary/40 hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-[700] leading-[20px] text-on-surface">{batch.batch_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(batch.batch_level ?? []).map((bl) => (
                          <span
                            key={bl.id}
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-[600] leading-[16px]",
                              commonLevelSet.has(bl.levels?.id)
                                ? "border-secondary-container/60 text-on-background/10 bg-primary-fixed/50"
                                : "border-outline-variant/30 text-on-surface-variant"
                            )}
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
                      {assigningBatchId === batch.id ? "Assigning..." : "Assign"}
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
        title="Assign students?"
        description={
          confirmBatch
            ? `Assign ${students.length} ${students.length === 1 ? "student" : "students"} to "${confirmBatch.batch_name}"?`
            : undefined
        }
        confirmLabel="Assign"
        isSubmitting={assigningBatchId !== null}
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
