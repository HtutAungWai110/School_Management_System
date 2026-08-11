"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { Module } from "@/types/module.type"

interface ModulesDeletePanelProps {
  module: Module
  onClose: () => void
}

export function ModulesDeletePanel({ module, onClose }: ModulesDeletePanelProps) {
  const pathname = usePathname()

  async function handleDelete() {
    const res = await fetch(`/api/modules/${module.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while deleting the module.")
    }

    await refetchData(pathname)
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title="Delete module"
      subtitle={module.title}
      codeChip={module.code}
      heading="Delete this module?"
      description={`This will permanently remove "${module.code} ${module.title}" along with its levels and enrollments. This action cannot be undone.`}
      confirmLabel="Delete module"
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
