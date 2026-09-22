"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { CalendarClock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"

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

interface AssignmentCreatePanelProps {
  batchId: string
  moduleId: string
  moduleCode: string
  moduleTitle: string
  teacherId: string
  teacherName: string
  onClose: () => void
}

export function AssignmentCreatePanel({
  batchId,
  moduleId,
  moduleCode,
  moduleTitle,
  teacherId,
  teacherName,
  onClose,
}: AssignmentCreatePanelProps) {
  const pathname = usePathname()
  const [deadlineAt, setDeadlineAt] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const detailRows: DetailRow[] = [
    { label: "Module code", value: moduleCode || "—" },
    { label: "Module title", value: moduleTitle || "—" },
    { label: "Teacher", value: teacherName || "—" },
  ]

  function createAssignment() {
    setSubmitError(null)
    setCreating(true)

    fetch(`/api/batches/${batchId}/assignments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_id: moduleId,
        teacher_id: teacherId,
        deadline_at: deadlineAt ? new Date(deadlineAt).toISOString() : null,
      }),
    })
      .then((res) =>
        res.json().then((body) => {
          if (!res.ok) throw new Error(body?.error ?? "Failed to create assignment")
          return body
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
        setCreating(false)
      })
  }

  return (
    <ModulesPanelShell
      title="Create assignment"
      subtitle="Set a deadline for this module assignment."
      codeChip={moduleCode || undefined}
      onClose={onClose}
      className="max-w-[600px]"
    >
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex-1 space-y-5 px-6 py-6">
          <div className="rounded-xl border border-primary/10 bg-surface-container-low/40 p-4">
            <Detail rows={detailRows} />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="assignment-deadline"
              className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant"
            >
              Deadline
            </label>
            <Input
              id="assignment-deadline"
              type="datetime-local"
              value={deadlineAt}
              onChange={(e) => setDeadlineAt(e.target.value)}
              className="h-10 w-full"
            />
            <p className="text-[12px] leading-[16px] text-on-surface-variant">
              Optional. When the assignment must be submitted by.
            </p>
          </div>

          {submitError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <footer className="shrink-0 flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="button" disabled={!moduleId || !teacherId || creating} onClick={createAssignment}>
            {creating ? (
              "Creating..."
            ) : (
              <>
                <CalendarClock className="size-4" />
                Create assignment
              </>
            )}
          </Button>
        </footer>
      </div>
    </ModulesPanelShell>
  )
}