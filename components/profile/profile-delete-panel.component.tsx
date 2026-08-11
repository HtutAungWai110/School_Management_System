"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { Profile } from "@/types/profile.type"

interface ProfileDeletePanelProps {
  profile: Profile
  onClose: () => void
}

export function ProfileDeletePanel({ profile, onClose }: ProfileDeletePanelProps) {
  const pathname = usePathname()

  const roleLabel = profile.role === "teacher" ? "teacher" : "student"

  async function handleDelete() {
    const res = await fetch(`/api/profile/${profile.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while deleting the profile.")
    }

    await refetchData(pathname)
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title={`Delete ${roleLabel}`}
      subtitle={profile.full_name}
      heading={`Delete this ${roleLabel}?`}
      description={`This will permanently remove "${profile.full_name}" along with all related enrollments and assignments. This action cannot be undone.`}
      confirmLabel={`Delete ${roleLabel}`}
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
