"use client"

import type { OverviewSession } from "@/types/student-overview.type"
import { STATUS_CONFIG, getModuleColorWithOpacity, type StatusKey } from "@/lib/utils.util"
import { DAY_LABELS, formatTime12, roomLabel } from "./overview-helpers"

export default function OverviewTimetableTable({ sessions }: { sessions: OverviewSession[] }) {
  return (
    <div className="overflow-x-auto min-h-40">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low">
          <tr>
            {["Module", "Teacher", "Classroom", "Day", "Time", "Status"].map((header) => (
              <th
                key={header}
                className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const moduleColor = getModuleColorWithOpacity(session.module_id, 0.3)
            const statusCfg = STATUS_CONFIG[session.status as StatusKey]

            return (
              <tr
                key={session.id}
                className="border-b border-primary/10 hover:bg-surface-container-low transition-colors"
              >
                <td className="px-6 py-4">
                  <div>
                    <span
                      className="inline-block text-[14px] font-[300] leading-[20px] px-2 py-0.5 rounded"
                      style={{ backgroundColor: moduleColor }}
                    >
                      {session.modules?.code ?? "—"}
                    </span>
                    <p className="text-[12px] leading-[16px] text-on-surface-variant mt-0.5">
                      {session.modules?.title ?? "Untitled module"}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface">
                    {session.profiles?.full_name ?? "—"}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">
                    {roomLabel(session) ?? "—"}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface">
                    {DAY_LABELS[session.day_of_week] ?? `Day ${session.day_of_week}`}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">
                    {formatTime12(session.start_time)} – {formatTime12(session.end_time)}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {statusCfg && (
                      <span
                        className="inline-block w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: statusCfg.color }}
                      />
                    )}
                    <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                      {statusCfg?.label ?? session.status}
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}