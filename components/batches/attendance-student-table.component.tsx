"use client"

import { useState } from "react"
import { PenLine } from "lucide-react"
import { cn } from "@/lib/utils.util"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SingleCombobox } from "@/components/timetable/single-combobox.component"
import type { AttendanceStudent } from "@/types/attendance.type"

const STATUS_BADGE: Record<string, { text: string; bg: string }> = {
  absent: { text: "text-red-700", bg: "bg-red-50 border-red-200" },
  present: { text: "text-green-700", bg: "bg-green-50 border-green-200" },
  late: { text: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200" },
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE[status] ?? {
    text: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-[600] leading-[14px] capitalize",
        style.text,
        style.bg
      )}
    >
      {status}
    </span>
  )
}

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
]

export type AttendanceUpdate = {
  id: string
  attendance_id: string
  student_id: string
  remark: string | null
  status: string
}

type Draft = {
  remark: string
  status: string
}

type Props = {
  students: AttendanceStudent[]
  editMode: boolean
  saving?: boolean
  onEnterEdit: () => void
  onCancel: () => void
  onSave: (updates: AttendanceUpdate[]) => void
}

export function AttendanceStudentTable({
  students,
  editMode,
  saving = false,
  onEnterEdit,
  onCancel,
  onSave,
}: Props) {
  const sorted = [...students].sort((a, b) =>
    (a.full_name ?? "").localeCompare(b.full_name ?? "")
  )

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      sorted.map((s) => [s.id, { remark: s.remark ?? "", status: s.status }])
    )
  )

  const updateDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { remark: "", status: "absent" }), [field]: value },
    }))
  }

  const handleSave = () => {
    const updates: AttendanceUpdate[] = []
    sorted.forEach((s) => {
      const draft = drafts[s.id]
      if (!draft) return
      const remarkChanged = (draft.remark ?? "") !== (s.remark ?? "")
      const statusChanged = draft.status !== s.status
      if (remarkChanged || statusChanged) {
        updates.push({
          id: s.id,
          attendance_id: s.attendance_id,
          student_id: s.student_id,
          remark: draft.remark || null,
          status: draft.status,
        })
      }
    })
    onSave(updates)
  }

  const handleCancel = () => {
    setDrafts({})
    onCancel()
  }

  return (
    <div className="pl-12 pr-5 pb-3">
      <div className="flex items-center justify-end gap-2 mb-2">
        {!editMode ? (
          <Button type="button" size="sm" variant="outline" onClick={onEnterEdit}>
            <PenLine className="size-3.5" />
            Edit Attendance
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-outline-variant/10 rounded-lg">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/10 bg-surface-container-low/50">
              <th className="w-[26%] px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider">
                Full Name
              </th>
              <th className="w-[30%] px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider">
                Email
              </th>
              <th className="w-[20%] px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="w-[24%] px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider">
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((student, i) => {
              const draft = drafts[student.id]
              return (
                <tr
                  key={student.id}
                  className={cn(
                    "border-b border-outline-variant/5 last:border-b-0",
                    i % 2 === 0 ? "bg-transparent" : "bg-surface-container-low/10"
                  )}
                >
                  <td className="px-4 py-2 text-[13px] font-[500] leading-[18px] text-on-surface truncate">
                    {student.full_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-2 text-[13px] leading-[18px] text-on-surface-variant truncate">
                    {student.email ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {editMode ? (
                      <SingleCombobox
                        options={STATUS_OPTIONS}
                        value={draft?.status ?? student.status}
                        onValueChange={(v) => updateDraft(student.id, "status", v)}
                        placeholder="Status"
                        emptyLabel="No statuses"
                        className="w-full min-w-[110px]"
                      />
                    ) : (
                      <StatusBadge status={student.status} />
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editMode ? (
                      <Input
                        value={draft?.remark ?? student.remark ?? ""}
                        placeholder="Add remark"
                        className="h-8 w-full min-w-[140px]"
                        onChange={(e) =>
                          updateDraft(student.id, "remark", e.target.value)
                        }
                      />
                    ) : (
                      <span className="text-[13px] leading-[18px] text-on-surface-variant">
                        {student.remark ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
