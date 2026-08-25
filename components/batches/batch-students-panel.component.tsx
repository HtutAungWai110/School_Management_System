"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { CheckCheck, Users, X } from "lucide-react"

import type { BatchAssignment } from "@/types/batch.type"
import { refetchData } from "@/lib/action.action"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { BatchStudentRow } from "./batch-student-row.component"

interface BatchStudentsPanelProps {
  batchId: string
  students: BatchAssignment[]
}

export function BatchStudentsPanel({ batchId, students }: BatchStudentsPanelProps) {
  const pathname = usePathname()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const selectMode = selectedIds.length > 0
  const allSelected = students.length > 0 && selectedIds.length === students.length

  function toggleSelect(assignmentId: string) {
    setSelectedIds((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId]
    )
  }

  function selectAll() {
    setSelectedIds(students.map((s) => s.id))
  }

  function clearSelection() {
    setSelectedIds([])
    setConfirmOpen(false)
    setRemoveError(null)
  }

  async function handleBulkRemove() {
    setRemoveError(null)
    setIsRemoving(true)

    try {
      const res = await fetch(`/api/batches/${batchId}/assignments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: selectedIds }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Something went wrong while removing the students.")
      }

      await refetchData(pathname)
      clearSelection()
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <>
      <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
        <div className="p-6 border-b border-outline-variant/10">
          {selectMode ? (
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[12px] font-[700] leading-[16px] text-on-primary-container">
                  <Users className="size-3.5" />
                  {selectedIds.length} selected
                </span>
                <span className="hidden text-[12px] font-[500] leading-[16px] text-on-surface-variant sm:inline">
                  Select mode is on
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={allSelected} onClick={selectAll}>
                  <CheckCheck />
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  <X />
                  Clear
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setRemoveError(null)
                    setConfirmOpen(true)
                  }}
                >
                  Remove selected
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center gap-4">
              <div>
                <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Assigned Students</h3>
                <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                  {students.length} student{students.length === 1 ? "" : "s"} in this batch
                </p>
              </div>
            </div>
          )}
        </div>

        {selectMode && removeError && (
          <p className="mx-6 mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
            {removeError}
          </p>
        )}

        {students.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto size-8 text-on-surface-variant/70" />
            <p className="mt-4 text-[14px] font-[600] leading-[20px] text-on-surface">
              No students assigned yet
            </p>
            <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
              Assign students to this batch from the Enrollments page.
            </p>
          </div>
        ) : (
          <ul>
            {students.map((assignment) => (
              <BatchStudentRow
                key={assignment.id}
                assignment={assignment}
                batchId={batchId}
                selectMode={selectMode}
                selected={selectedIds.includes(assignment.id)}
                onToggleSelect={() => toggleSelect(assignment.id)}
                onSelect={() => toggleSelect(assignment.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Remove ${selectedIds.length} ${selectedIds.length === 1 ? "student" : "students"}?`}
        description={
          removeError ??
          `Remove ${selectedIds.length} selected ${
            selectedIds.length === 1 ? "student" : "students"
          } from this batch? They will lose access to batch-specific resources.`
        }
        confirmLabel="Remove"
        variant="destructive"
        isSubmitting={isRemoving}
        onConfirm={() => void handleBulkRemove()}
        onCancel={() => {
          setConfirmOpen(false)
          setRemoveError(null)
        }}
      />
    </>
  )
}
