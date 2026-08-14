"use client"

import { usePathname } from "next/navigation"

import { ConfirmDeletePanel } from "@/components/ui/confirm-delete-panel.component"
import { refetchData } from "@/lib/action.action"
import type { EnrolledStudent } from "@/types/enrollment.type"

interface EnrollmentBulkDeletePanelProps {
  students: EnrolledStudent[]
  onClose: () => void
}

export function EnrollmentBulkDeletePanel({ students, onClose }: EnrollmentBulkDeletePanelProps) {
  const pathname = usePathname()
  const studentIds = students.map((s) => s.id)
  const count = students.length

  async function handleDelete() {
    const res = await fetch("/api/enrollments", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_ids: studentIds }),
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
      subtitle={`${count} ${count === 1 ? "student" : "students"}`}
      heading={`Remove these students' enrollments?`}
      description={`This will unenroll ${count} ${count === 1 ? "student" : "students"} from all their modules. This action cannot be undone.`}
      confirmLabel={count === 1 ? "Delete enrollment" : "Delete enrollments"}
      onClose={onClose}
      onConfirm={handleDelete}
    />
  )
}
