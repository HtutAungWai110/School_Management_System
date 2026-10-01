"use client"

import { MapPin } from "lucide-react"

import type { OverviewSession } from "@/types/student-overview.type"
import { STATUS_CONFIG, getModuleColorWithOpacity, type StatusKey } from "@/lib/utils.util"

export default function OverviewSessionCard({ session }: { session: OverviewSession }) {
  const moduleColor = getModuleColorWithOpacity(session.module_id, 0.3)
  const statusCfg = STATUS_CONFIG[session.status as StatusKey]
  const room = session.classes
    ? [session.classes.class_number, session.classes.location].filter(Boolean).join(" · ")
    : "—"

  return (
    <div className="group relative rounded-lg border border-outline-variant/20 bg-surface-container-low/30 p-2.5 hover:border-primary/30 hover:bg-surface-container-low/60 transition-all duration-150 min-h-[80px]">
      <div className="flex items-start justify-between gap-1 mb-1">
        <span
          className="text-[10px] font-[500] leading-[13px] tracking-wide truncate px-1.5 py-0.5 rounded"
          style={{ backgroundColor: moduleColor }}
        >
          {session.modules?.code ?? "—"}
        </span>
      </div>

      <p className="text-[10px] leading-[13px] text-on-surface-variant mb-1.5 line-clamp-2">
        {session.modules?.title ?? "Untitled module"}
      </p>

      <div className="space-y-0.5">
        <div className="flex items-center gap-1 text-[9px] leading-[12px] text-on-surface-variant">
          <MapPin className="w-2.5 h-2.5 shrink-0" />
          <span className="truncate">{room}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1">
        {statusCfg && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: statusCfg.color }}
          />
        )}
        <span className="text-[8px] font-[600] leading-[10px] text-on-surface-variant">
          {statusCfg?.label ?? session.status}
        </span>
      </div>
    </div>
  )
}