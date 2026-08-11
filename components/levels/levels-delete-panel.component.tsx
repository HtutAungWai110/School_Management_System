"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { Level } from "@/types/module.type"

interface LevelsDeletePanelProps {
  level: Level
  onClose: () => void
}

export function LevelsDeletePanel({ level, onClose }: LevelsDeletePanelProps) {
  const pathname = usePathname()

  async function handleDelete() {
    const res = await fetch(`/api/levels/${level.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while deleting the level.")
    }

    await refetchData(pathname)
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title="Delete level"
      subtitle={level.description}
      heading="Delete this level?"
      description={`This will permanently remove "${level.description}" along with its module and batch associations. This action cannot be undone.`}
      confirmLabel="Delete level"
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
