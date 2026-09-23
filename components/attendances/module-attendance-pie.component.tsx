"use client"

import { motion } from "motion/react"
import type { ModuleAttendanceStats } from "./attendance-report.data"

export const ATTENDANCE_STATUS_COLORS = {
  present: "#22c55e",
  late: "#9ca3af",
  absent: "#ef4444",
} as const

function Donut({
  present,
  late,
  absent,
}: {
  present: number
  late: number
  absent: number
}) {
  const total = present + late + absent
  const size = 132
  const stroke = 15
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-outline-variant)"
          strokeOpacity={0.4}
          strokeWidth={stroke}
        />
      </svg>
    )
  }

  const slices = [
    { key: "present", value: present, color: ATTENDANCE_STATUS_COLORS.present },
    { key: "late", value: late, color: ATTENDANCE_STATUS_COLORS.late },
    { key: "absent", value: absent, color: ATTENDANCE_STATUS_COLORS.absent },
  ].filter((s) => s.value > 0)

  let start = 0
  const arcs = slices.map((s) => {
    const length = (s.value / total) * circumference
    const arc = { ...s, length, start }
    start += length
    return arc
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-outline-variant)"
        strokeOpacity={0.15}
        strokeWidth={stroke}
      />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {arcs.map((arc) => (
          <motion.circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            initial={{ strokeDashoffset: -(arc.start + arc.length) }}
            animate={{ strokeDashoffset: -arc.start }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
          />
        ))}
      </g>
    </svg>
  )
}

function LegendRow({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total ? Math.round((count / total) * 1000) / 10 : 0
  return (
    <li className="flex items-center justify-between gap-2 text-[12px] leading-[16px]">
      <span className="flex items-center gap-1.5 text-on-surface-variant">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
      <span className="font-[600] text-on-surface">
        {count}
        <span className="ml-1 font-[500] text-on-surface-variant/70">({pct}%)</span>
      </span>
    </li>
  )
}

export function ModuleAttendancePie({
  modules,
}: {
  modules: ModuleAttendanceStats[]
}) {
  if (modules.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((m) => {
        const rate =
          m.total > 0 ? Math.round((m.present / m.total) * 1000) / 10 : 0
        return (
          <div
            key={m.moduleId}
            className="rounded-lg border border-outline-variant/10 bg-surface-container-low/30 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="bg-primary-fixed/50 border-secondary-container/60 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-[700] leading-[14px] tracking-wide uppercase text-on-background/10 shrink-0">
                {m.code}
              </span>
              <h4 className="truncate text-[13px] font-[600] leading-[18px] text-on-surface">
                {m.title}
              </h4>
            </div>

            <div className="mt-4 flex items-center gap-5">
              <div className="relative">
                <Donut present={m.present} late={m.late} absent={m.absent} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-[700] leading-[22px] text-on-surface">
                    {rate.toFixed(0)}%
                  </span>
                  <span className="text-[10px] leading-[12px] text-on-surface-variant">
                    rate
                  </span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5">
                <LegendRow
                  label="Present"
                  count={m.present}
                  total={m.total}
                  color={ATTENDANCE_STATUS_COLORS.present}
                />
                <LegendRow
                  label="Late"
                  count={m.late}
                  total={m.total}
                  color={ATTENDANCE_STATUS_COLORS.late}
                />
                <LegendRow
                  label="Absent"
                  count={m.absent}
                  total={m.total}
                  color={ATTENDANCE_STATUS_COLORS.absent}
                />
              </ul>
            </div>

            <div className="mt-3 border-t border-outline-variant/10 pt-2 text-[11px] leading-[14px] text-on-surface-variant">
              {m.sessions} active session{m.sessions !== 1 ? "s" : ""} · {m.total} record
              {m.total !== 1 ? "s" : ""}
            </div>
          </div>
        )
      })}
    </div>
  )
}