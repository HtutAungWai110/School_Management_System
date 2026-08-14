"use client"

import { useState } from "react"
import { Users, X, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PaginationNav } from "@/components/navigation/pagination-nav.component"
import { EnrollmentRow } from "./enrollment-row.component"
import { EnrollmentBulkBatchPanel } from "./enrollment-bulk-batch-panel.component"
import { EnrollmentBulkDeletePanel } from "./enrollment-bulk-delete-panel.component"
import type { EnrolledStudent } from "@/types/enrollment.type"

interface EnrollmentDirectoryProps {
  students: EnrolledStudent[]
  totalCount: number
  page: number
  totalPages: number
}

export function EnrollmentDirectory({
  students,
  totalCount,
  page,
  totalPages,
}: EnrollmentDirectoryProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const selectMode = selectedIds.length > 0
  const selectedStudents = students.filter((student) => selectedIds.includes(student.id))
  const allSelected = students.length > 0 && selectedIds.length === students.length

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selected) => selected !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(students.map((student) => student.id))
  }

  function clearSelection() {
    setSelectedIds([])
    setAssignOpen(false)
    setDeleteOpen(false)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low">
            {selectMode ? (
              <tr>
                <th colSpan={5} scope="colgroup" className="px-6 py-3">
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
                      <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
                        Assign to batch
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        Delete selected
                      </Button>
                    </div>
                  </div>
                </th>
              </tr>
            ) : (
              <tr>
                {["Student", "Enrolled Modules", "Level", "Enrolled At", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {students.map((student) => (
              <EnrollmentRow
                key={student.id}
                student={student}
                selectMode={selectMode}
                selected={selectedIds.includes(student.id)}
                onToggle={() => toggleSelect(student.id)}
                onSelect={() => toggleSelect(student.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center bg-surface-container-low/20 border-t border-outline-variant/10 px-6 py-4">
        <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
          Showing 1-{students.length} of {totalCount} students
        </p>
        <PaginationNav page={page} totalPages={totalPages} />
      </div>

      {assignOpen && selectedStudents.length > 0 && (
        <EnrollmentBulkBatchPanel students={selectedStudents} onClose={clearSelection} />
      )}
      {deleteOpen && selectedStudents.length > 0 && (
        <EnrollmentBulkDeletePanel students={selectedStudents} onClose={clearSelection} />
      )}
    </>
  )
}
