"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { Batch } from "@/types/batch.type"

interface BatchesDeletePanelProps {
  batch: Batch
  onClose: () => void
}

export function BatchesDeletePanel({ batch, onClose }: BatchesDeletePanelProps) {
  const pathname = usePathname()

  async function handleDelete() {
    const res = await fetch(`/api/batches/${batch.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while deleting the batch.")
    }

    await refetchData(pathname)
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title="Delete batch"
      subtitle={batch.batch_name}
      heading="Delete this batch?"
      description={`This will permanently remove "${batch.batch_name}" along with its level and student assignments. This action cannot be undone.`}
      confirmLabel="Delete batch"
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
