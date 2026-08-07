"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Batch } from "@/types/batch.type"

interface BatchesDeletePanelProps {
  batch: Batch
  onClose: () => void
}

export function BatchesDeletePanel({ batch, onClose }: BatchesDeletePanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setSubmitError(null)
    setIsDeleting(true)

    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while deleting the batch.")
        setIsDeleting(false)
        return
      }

      await refetchData(pathname)
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
      setIsDeleting(false)
    }
  }

  return (
    <ModulesPanelShell
      title="Delete batch"
      subtitle={batch.batch_name}
      onClose={onClose}
      className="max-w-[480px]"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            <Trash2 className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-[14px] font-[600] leading-[20px] text-on-surface">Delete this batch?</p>
              <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
                This will permanently remove &quot;{batch.batch_name}&quot; along with its level and student
                assignments. This action cannot be undone.
              </p>
            </div>
          </div>

          {submitError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            Delete batch
          </Button>
        </footer>
      </div>
    </ModulesPanelShell>
  )
}
