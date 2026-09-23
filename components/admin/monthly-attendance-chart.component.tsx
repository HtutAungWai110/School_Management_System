"use client"

import { useState } from "react"
import { MotionConfig, motion } from "motion/react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export type MonthlyAttendance = {
  month: string
  classSessions: number
  presentCount: number
  absentCount: number
  lateCount: number
  averageAttendancePercentage: number
}

export type MonthlyAttendanceChartProps = {
  data: MonthlyAttendance[]
  title?: string
}

type RangeKey =
  | "this-month"
  | "last-month"
  | "last-3"
  | "last-6"
  | "this-year"
  | "all"

const RANGE_ITEMS: Record<RangeKey, string> = {
  "this-month": "This Month",
  "last-month": "Last Month",
  "last-3": "Last 3 Months",
  "last-6": "Last 6 Months",
  "this-year": "This Year",
  all: "All Time",
}

const RANGE_KEYS = Object.keys(RANGE_ITEMS) as RangeKey[]

const SERIES = {
  present: { label: "Present", color: "#22c55e" },
  late: { label: "Late", color: "#9ca3af" },
  absent: { label: "Absent", color: "#ef4444" },
  average: { label: "Average", color: "#3b82f6" },
} as const

const GRID_VALUES = [100, 75, 50, 25, 0]

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short" })
}

function monthTitle(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function filterRange(months: string[], range: RangeKey) {
  const now = new Date()
  const current = toMonthKey(now)
  const shifted = (offset: number) =>
    toMonthKey(new Date(now.getFullYear(), now.getMonth() + offset, 1))

  switch (range) {
    case "this-month":
      return months.filter((month) => month === current)
    case "last-month": {
      const target = shifted(-1)
      return months.filter((month) => month === target)
    }
    case "last-3": {
      const start = shifted(-2)
      return months.filter((month) => month >= start && month <= current)
    }
    case "last-6": {
      const start = shifted(-5)
      return months.filter((month) => month >= start && month <= current)
    }
    case "this-year": {
      const start = `${now.getFullYear()}-01`
      return months.filter((month) => month >= start && month <= current)
    }
    case "all":
      return months
  }
}

export function MonthlyAttendanceChart({
  data,
  title = "Student Attendance",
}: MonthlyAttendanceChartProps) {
  const [range, setRange] = useState<RangeKey>("this-month")

  const months = filterRange(
    data.map((entry) => entry.month).sort(),
    range
  )

  const filtered = data
    .filter((entry) => months.includes(entry.month))
    .sort((a, b) => a.month.localeCompare(b.month))

  const average = filtered.length
    ? filtered.reduce((sum, entry) => sum + entry.averageAttendancePercentage, 0) /
      filtered.length
    : 0

  const totals = filtered.reduce(
    (acc, entry) => ({
      present: acc.present + entry.presentCount,
      absent: acc.absent + entry.absentCount,
      late: acc.late + entry.lateCount,
      sessions: acc.sessions + entry.classSessions,
    }),
    { present: 0, absent: 0, late: 0, sessions: 0 }
  )

  const subtitle =
    filtered.length === 0
      ? "No attendance recorded in the selected range"
      : filtered.length === 1
        ? `Attendance rate for ${monthTitle(filtered[0].month)}`
        : `Average attendance rate across ${filtered.length} months`

  return (
    <div className="rounded-xl border border-primary/10 bg-surface-container-lowest p-6 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-[600] leading-[28px] text-primary">
            {title}
          </h2>
          <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
            {subtitle}:{" "}
            <span className="font-bold text-primary">{average.toFixed(1)}%</span>
          </p>
        </div>

        <Select
          value={range}
          onValueChange={(value) => value && setRange(value as RangeKey)}
          items={RANGE_ITEMS}
        >
          <SelectTrigger className="h-8 w-[150px] justify-between rounded-lg text-[12px] font-[500] leading-[16px] text-on-surface focus:ring-2 focus:ring-primary/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {RANGE_ITEMS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/30 text-center">
          <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
            No attendance recorded yet
          </p>
          <p className="text-[12px] leading-[16px] text-on-surface-variant">
            Attendance reports will appear here once teachers start checking in.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant/30 text-center">
          <p className="text-[14px] font-[500] leading-[20px] text-on-surface">
            No sessions in {RANGE_ITEMS[range]}
          </p>
          <p className="text-[12px] leading-[16px] text-on-surface-variant">
            Try a different range from the dropdown.
          </p>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="h-64">
            <div className="relative h-full pl-12 pr-3 pt-6">
              <div className="pointer-events-none absolute bottom-0 left-12 right-3 top-6 flex flex-col justify-between">
                {GRID_VALUES.map((value) => (
                  <div key={value} className="relative w-full">
                    <div
                      className={`w-full border-t ${
                        value === 0
                          ? "border-outline-variant/30"
                          : "border-outline-variant/5"
                      }`}
                    />
                    {value > 0 && (
                      <span className="absolute -left-10 top-0 w-8 -translate-y-1/2 text-right text-[10px] leading-none text-on-surface-variant/70">
                        {value}%
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div
                key={range}
                className="absolute bottom-0 left-12 right-3 top-6"
              >
                <div className="flex h-full w-full items-end justify-center gap-3">
                  {filtered.map((entry, index) => {
                    const total =
                      entry.presentCount + entry.lateCount + entry.absentCount
                    const presentPct = total
                      ? (entry.presentCount / total) * 100
                      : 0
                    const latePct = total ? (entry.lateCount / total) * 100 : 0
                    const absentPct = total ? (entry.absentCount / total) * 100 : 0

                    return (
                      <div
                        key={entry.month}
                        className="flex h-full min-w-0 flex-1 items-end justify-center gap-1.5"
                      >
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="group flex h-full w-full max-w-8 flex-1 items-end" />
                            }
                            aria-label={`${monthTitle(entry.month)} attendance summary`}
                          >
                            <motion.div
                              className="flex h-full w-full flex-col-reverse gap-px"
                              style={{ transformOrigin: "bottom" }}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 130,
                                damping: 20,
                                delay: index * 0.08,
                              }}
                            >
                              <div
                                className="w-full transition-all duration-300 group-hover:brightness-110"
                                style={{
                                  height: `${presentPct}%`,
                                  backgroundColor: SERIES.present.color,
                                }}
                              />
                              <div
                                className="w-full transition-all duration-300 group-hover:brightness-110"
                                style={{
                                  height: `${latePct}%`,
                                  backgroundColor: SERIES.late.color,
                                }}
                              />
                              <div
                                className="w-full rounded-t-2xl transition-all duration-300 group-hover:brightness-110"
                                style={{
                                  height: `${absentPct}%`,
                                  backgroundColor: SERIES.absent.color,
                                }}
                              />
                            </motion.div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            sideOffset={8}
                            className="flex flex-col gap-1 bg-surface-container-high px-3 py-2 text-on-surface shadow-lg"
                          >
                            <span className="text-[11px] font-[600] leading-[14px] text-on-surface-variant">
                              {monthTitle(entry.month)}
                            </span>
                            <span className="text-[20px] font-[700] leading-[24px] text-primary">
                              {entry.averageAttendancePercentage.toFixed(1)}%
                            </span>
                            <div className="mt-0.5 flex flex-col gap-1 border-t border-outline-variant/10 pt-1.5 text-[11px] leading-[14px]">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: SERIES.present.color }}
                                />
                                Present <b className="text-on-surface">{entry.presentCount}</b>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: SERIES.late.color }}
                                />
                                Late <b className="text-on-surface">{entry.lateCount}</b>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <span
                                  className="size-1.5 rounded-full"
                                  style={{ backgroundColor: SERIES.absent.color }}
                                />
                                Absent <b className="text-on-surface">{entry.absentCount}</b>
                              </span>
                            </div>
                            <span className="text-[11px] leading-[14px] text-on-surface-variant">
                              {entry.classSessions} session
                              {entry.classSessions === 1 ? "" : "s"}
                            </span>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <div className="group flex h-full w-full max-w-8 flex-1 items-end" />
                            }
                            aria-label={`${monthTitle(entry.month)} average attendance`}
                          >
                            <motion.div
                              className="w-full rounded-t-2xl transition-all duration-300 group-hover:brightness-110"
                              style={{
                                height: `${entry.averageAttendancePercentage}%`,
                                transformOrigin: "bottom",
                                backgroundColor: SERIES.average.color,
                              }}
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 130,
                                damping: 20,
                                delay: index * 0.08 + 0.12,
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            sideOffset={8}
                            className="flex flex-col items-center gap-1 bg-surface-container-high px-3 py-2 text-on-surface shadow-lg"
                          >
                            <span className="text-[11px] font-[600] leading-[14px] text-on-surface-variant">
                              {monthTitle(entry.month)}
                            </span>
                            <span className="flex items-center gap-1.5 text-[14px] font-[700] leading-[20px]">
                              <span
                                className="size-1.5 rounded-full"
                                style={{ backgroundColor: SERIES.average.color }}
                              />
                              {entry.averageAttendancePercentage.toFixed(1)}%
                            </span>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-3 flex w-full justify-center gap-3 pl-12 pr-3">
              {filtered.map((entry) => (
                <span
                  key={entry.month}
                  className="min-w-0 flex-1 text-center text-[12px] font-[500] leading-[16px] text-on-surface-variant"
                >
                  {monthLabel(entry.month)}
                </span>
              ))}
            </div>
          </div>
        </MotionConfig>
      )}

      {filtered.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-outline-variant/10 pt-4 text-[12px] font-[500] leading-[16px] text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: SERIES.present.color }}
            />
            Present {totals.present}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: SERIES.late.color }}
            />
            Late {totals.late}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: SERIES.absent.color }}
            />
            Absent {totals.absent}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-[3px]"
              style={{ backgroundColor: SERIES.average.color }}
            />
            Average
          </span>
          <span className="ml-auto text-on-surface">{totals.sessions} sessions</span>
        </div>
      )}
    </div>
  )
}
