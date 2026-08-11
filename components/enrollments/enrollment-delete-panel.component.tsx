"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { EnrolledStudent } from "@/types/enrollment.type"

interface EnrollmentDeletePanelProps {
  student: EnrolledStudent
  onClose: () => void
}

export function EnrollmentDeletePanel({ student, onClose }: EnrollmentDeletePanelProps) {
  const pathname = usePathname()

  async function handleDelete() {
    const res = await fetch(`/api/enrollments/${student.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? "Something went wrong while removing the enrollments.")
    }

    await refetchData(pathname)
    onClose()
  }

  return (
    <ConfirmDeletePanel
      title="Delete enrollments"
      subtitle={student.full_name}
      heading="Remove this student's enrollments?"
      description={`This will unenroll ${student.full_name} from all modules. This action cannot be undone.`}
      confirmLabel="Delete enrollments"
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
