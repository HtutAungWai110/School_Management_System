"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import StudentAttendancePanel from "./student-attendance-panel.component"
import type { BatchStatus } from "@/types/batch.type"
import type { OverviewBatch } from "@/types/student-overview.type"
import { cn } from "@/lib/utils.util"

export default function StudentAttendanceBatches({ batches }: { batches: OverviewBatch[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  function toggle(batchId: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 px-6 py-12 text-center">
        <p className="text-[14px] font-medium leading-5 text-on-surface">
          You aren&apos;t assigned to a batch yet
        </p>
        <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
          Attendance appears here once your academy assigns you to a batch.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <ul className="divide-y divide-outline-variant/15">
        {batches.map((batch) => {
          const isOpen = expanded.has(batch.id)

          return (
            <li key={batch.id}>
              <button
                type="button"
                onClick={() => toggle(batch.id)}
                aria-expanded={isOpen}
                aria-controls={`attendance-panel-${batch.id}`}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-container-low/50"
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-on-surface-variant transition-transform duration-200",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 text-on-surface">
                  {batch.batch_name}
                </span>
                <BatchStatusBadge status={(batch.status as BatchStatus | null) ?? null} />
              </button>

              {/* Only mounted after the first expand, so the attendance request
                  happens on demand rather than for every batch up front. */}
              {expanded.has(batch.id) && (
                <div
                  id={`attendance-panel-${batch.id}`}
                  className="grid grid-rows-[1fr] border-t border-outline-variant/15"
                >
                  <div className="overflow-hidden">
                    <div className="px-5 py-6">
                      <StudentAttendancePanel batchId={batch.id} />
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}