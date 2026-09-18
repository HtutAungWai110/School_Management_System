"use client"

import { useState } from "react"
import { LayoutGrid, List } from "lucide-react"
import type { Class } from "@/types/class.type"
import type { TimetableSession } from "./timetable-session-table.component"
import { TimetableSessionTable } from "./timetable-session-table.component"
import { TimetableWeeklyGrid } from "./timetable-weekly-grid.component"
import { getModuleColorWithOpacity, STATUS_CONFIG } from "@/lib/utils.util"

interface TimetableSessionWrapperProps {
  title: string
  subtitle: string
  sessions: TimetableSession[]
  showDay?: boolean
  classes?: Class[]
}

export function TimetableSessionWrapper({ title, subtitle, sessions, showDay = false, classes }: TimetableSessionWrapperProps) {
  const [view, setView] = useState<"grid" | "list">("list")

  const uniqueModules = Array.from(
    new Map(sessions.map((s) => [s.module_id, { code: s.modules.code, title: s.modules.title }])).values()
  )

  const statusEntries = Object.entries(STATUS_CONFIG) as [string, { color: string; label: string }][]

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
        <div>
          <h2 className="text-[20px] font-[600] leading-[28px] text-primary">{title}</h2>
          <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{subtitle}</span>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-outline-variant/20 bg-surface-container-low p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => setView("grid")}
            className={`rounded-md p-1.5 transition-colors ${
              view === "grid"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => setView("list")}
            className={`rounded-md p-1.5 transition-colors ${
              view === "list"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === "list" ? (
        <TimetableSessionTable
          title={title}
          subtitle={subtitle}
          sessions={sessions}
          showDay={showDay}
          classes={classes}
          embedded
        />
      ) : (
        <TimetableWeeklyGrid sessions={sessions} classes={classes} />
      )}

      <div className="px-6 py-3 border-t border-outline-variant/10 bg-surface-container-low/30">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[10px] font-[600] leading-[13px] text-on-surface-variant uppercase tracking-wider">
            Legend
          </span>

          <div className="flex flex-wrap items-center gap-3">
            {uniqueModules.map((m) => {
              const code = sessions.find((s) => s.modules.code === m.code)?.module_id ?? ""
              return (
                <div key={m.code} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: getModuleColorWithOpacity(code, 0.3) }}
                  />
                  <span className="text-[11px] leading-[14px] text-on-surface-variant whitespace-nowrap">
                    {m.title}
                  </span>
                </div>
              )
            })}
          </div>

          <span className="w-px h-3 bg-outline-variant/30" />

          <div className="flex items-center gap-3">
            {statusEntries.map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="text-[11px] leading-[14px] text-on-surface-variant whitespace-nowrap">
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
