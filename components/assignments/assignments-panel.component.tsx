"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Mail, Phone, FileText, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils.util"
import { useAssignmentsData } from "./use-assignments-data.hook"
import { AssignmentStudentsTable } from "./assignment-students-table.component"

function formatDue(value: string | null): string {
  if (!value) return "No deadline"
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AssignmentsPanel({ batchId }: { batchId: string }) {
  const { data, loading, error } = useAssignmentsData(batchId)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const assignments = useMemo(() => data ?? [], [data])
  const totalSubmissions = useMemo(
    () => assignments.reduce((sum, a) => sum + (a.student_assignments?.length ?? 0), 0),
    [assignments]
  )

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      {/* Header */}
      <div className="p-6 border-b border-outline-variant/10">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-on-surface-variant" />
              <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">
                Assignments
              </h3>
            </div>
            <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
              Turned-in work across all assignments for this batch.
            </p>
          </div>
          {assignments.length > 0 && (
            <span className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[600] leading-[12px] border border-secondary-container/60 shrink-0">
              {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} · {totalSubmissions} submission
              {totalSubmissions !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="border border-outline-variant/10 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="px-5 py-3 bg-surface-container-low/50 border-b border-outline-variant/10 flex items-center gap-3">
                  <div className="w-5 h-5 bg-surface-container-high rounded" />
                  <div className="w-16 h-5 bg-surface-container-high rounded-md" />
                  <div className="w-32 h-5 bg-surface-container-high rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-[14px] leading-[20px] text-destructive">{error}</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="mx-auto size-8 text-on-surface-variant/50" />
            <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">
              No assignments yet
            </p>
            <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
              Create an assignment for this batch to start collecting work.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {assignments.map((assignment) => {
              const isExpanded = expanded.has(assignment.id)
              const submissions = assignment.student_assignments ?? []

              return (
                <div key={assignment.id}>
                  <button
                    type="button"
                    onClick={() => toggle(assignment.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-container-low/50 cursor-pointer",
                      isExpanded && "bg-surface-container-low/30"
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-on-surface-variant transition-transform duration-200 shrink-0",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                    <span className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-2 py-0.5 rounded-md border border-secondary-container/60 text-[11px] font-[700] leading-[14px] tracking-wide uppercase shrink-0">
                      {assignment.modules?.code}
                    </span>
                    <span className="text-[14px] font-[600] leading-[20px] text-on-surface truncate">
                      {assignment.modules?.title}
                    </span>
                    {assignment.profiles && (
                      <span className="inline-flex items-center text-[12px] font-[500] leading-[16px] text-on-surface-variant shrink-0">
                        {assignment.profiles.full_name}
                        {assignment.profiles.email && (
                          <>
                            <Mail className="ml-1 size-3.5 text-on-surface-variant/80" />
                            {assignment.profiles.email}
                          </>
                        )}
                        {assignment.profiles.phone && (
                          <>
                            <Phone className="ml-1 size-3.5 text-on-surface-variant/80" />
                            {assignment.profiles.phone}
                          </>
                        )}
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-[500] leading-[14px] text-on-surface-variant shrink-0">
                      <CalendarClock className="size-3.5" />
                      {formatDue(assignment.deadline_at)}
                    </span>
                    <span className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-[600] leading-[12px] border border-secondary-container/60 shrink-0">
                      {submissions.length} submitted
                    </span>
                  </button>

                  {isExpanded && <AssignmentStudentsTable students={submissions} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}