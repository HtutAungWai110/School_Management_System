"use client"

import { motion } from "motion/react"
import { Mail, Phone } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { StudentModuleRate } from "./attendance-report.data"

export function StudentAttendanceRateChart({
  students,
}: {
  students: StudentModuleRate[]
}) {
  if (students.length === 0) return null

  return (
    <div className="max-h-96 overflow-y-auto pr-1">
      {students.map((student) => (
        <div
          key={student.studentId}
          className="border-b border-outline-variant/5 py-3 last:border-b-0"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-[13px] font-[600] leading-[18px] text-on-surface">
              {student.fullName}
            </p>
            {student.email && (
              <span className="inline-flex min-w-0 items-center gap-1 text-[11px] leading-[14px] text-on-surface-variant">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{student.email}</span>
              </span>
            )}
            {student.phone && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] leading-[14px] text-on-surface-variant">
                <Phone className="size-3.5 shrink-0" />
                {student.phone}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-stretch gap-4">
            {student.modules.map((mod, i) => (
              <Tooltip key={mod.moduleId}>
                <TooltipTrigger
                  render={
                    <div className="min-w-16 flex-1 cursor-pointer" aria-hidden="true" />
                  }
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11px] font-[600] leading-[14px] text-on-surface-variant">
                      {mod.code}
                    </span>
                    <span className="text-[11px] font-[700] leading-[14px] text-on-surface">
                      {mod.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(mod.percentage, 100)}%` }}
                      transition={{
                        type: "spring",
                        stiffness: 90,
                        damping: 18,
                        delay: 0.08 * i,
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span>{mod.title}</span>
                  <span className="font-[600]">{mod.percentage}% attendance</span>
                  <span>
                    {mod.present} present · {mod.total} recorded
                  </span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}