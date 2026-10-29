"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";

import type {
  MonthlyAttendanceDay,
  MonthlyAttendanceReport,
} from "@/types/school.type";

type SeriesKey = "present" | "absent" | "late";

type SeriesConfig = {
  key: SeriesKey;
  label: string;
  color: string;
  fillOpacity: number;
};

/* Status colours, not brand colours: a present mark is not an action. The
   hex values live in globals.css so light and dark each get their own tone. */
const SERIES: SeriesConfig[] = [
  { key: "present", label: "Present", color: "var(--c-present)", fillOpacity: 0.3 },
  { key: "absent", label: "Absent", color: "var(--c-absent)", fillOpacity: 0.14 },
  { key: "late", label: "Late", color: "var(--c-late)", fillOpacity: 0.16 },
];

/* Areas are painted back-to-front, then every stroke on top of every area.
   Otherwise the green wash buries the red and yellow lines underneath it. */
const AREA_ORDER: SeriesKey[] = ["absent", "late", "present"];
const LINE_ORDER: SeriesKey[] = ["absent", "late", "present"];

const DAY_LABELS: Record<number, { short: string; long: string }> = {
  0: { short: "Sun", long: "Sunday" },
  1: { short: "Mon", long: "Monday" },
  2: { short: "Tue", long: "Tuesday" },
  3: { short: "Wed", long: "Wednesday" },
  4: { short: "Thu", long: "Thursday" },
  5: { short: "Fri", long: "Friday" },
  6: { short: "Sat", long: "Saturday" },
};

const Y_TICKS = [100, 75, 50, 25, 0];
const PLOT_HEIGHT = 300;
const PAD = { top: 30, right: 18, bottom: 52, left: 42 };
const MAX_RUG_TICKS = 8;

type Point = { x: number; y: number };

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function parseMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
}

function monthTitle(month: string) {
  return parseMonth(month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthRange(month: string) {
  const start = parseMonth(month);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const format = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${format(start)} – ${format(end)}`;
}

function shiftMonth(month: string, offset: number) {
  const date = parseMonth(month);
  date.setMonth(date.getMonth() + offset);
  return monthKey(date);
}

function seriesValue(day: MonthlyAttendanceDay, key: SeriesKey) {
  if (key === "present") return day.presentPercentage;
  if (key === "absent") return day.absentPercentage;
  return day.latePercentage;
}

function seriesCount(day: MonthlyAttendanceDay, key: SeriesKey) {
  if (key === "present") return day.presentCount;
  if (key === "absent") return day.absentCount;
  return day.lateCount;
}

function totalValue(report: MonthlyAttendanceReport, key: SeriesKey) {
  if (key === "present") return report.totals.presentPercentage;
  if (key === "absent") return report.totals.absentPercentage;
  return report.totals.latePercentage;
}

function totalCount(report: MonthlyAttendanceReport, key: SeriesKey) {
  if (key === "present") return report.totals.presentCount;
  if (key === "absent") return report.totals.absentCount;
  return report.totals.lateCount;
}

/**
 * Cardinal spline through the weekday points.
 *
 * Control points are clamped to the plot, so a steep Thursday cannot bow the
 * curve above 100% or below the baseline — the chart never draws a value it
 * did not receive.
 */
function smoothPath(points: Point[], top: number, bottom: number) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const clamp = (value: number) => Math.min(bottom, Math.max(top, value));
  const tension = 0.2;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;

    const control1x = current.x + (next.x - previous.x) * tension;
    const control1y = clamp(current.y + (next.y - previous.y) * tension);
    const control2x = next.x - (after.x - current.x) * tension;
    const control2y = clamp(next.y - (after.y - current.y) * tension);

    path += ` C ${control1x} ${control1y}, ${control2x} ${control2y}, ${next.x} ${next.y}`;
  }

  return path;
}

function areaPath(points: Point[], baseline: number, top: number) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const [point] = points;
    return `M ${point.x} ${baseline} L ${point.x} ${point.y} L ${point.x} ${baseline} Z`;
  }

  const last = points[points.length - 1];
  const first = points[0];
  return `${smoothPath(points, top, baseline)} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function ChartSkeleton() {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl bg-surface-container-low/40"
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((row) => (
        <div
          key={row}
          className="absolute inset-x-0 border-t border-outline-variant/15"
          style={{ top: `${18 + row * 17}%` }}
        />
      ))}
      <div className="absolute inset-x-0 top-0 h-2/3 animate-pulse bg-gradient-to-b from-surface-container-high/50 via-surface-container-high/20 to-transparent" />
      <div className="absolute bottom-10 left-1/2 h-24 w-2/3 -translate-x-1/2 animate-pulse rounded-full bg-surface-container-high/25 blur-2xl" />
    </div>
  );
}

function ChartError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-error/30 bg-error/5 px-6 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-error/10 text-error">
        <AlertCircle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-[14px] font-semibold leading-5 text-on-surface">
        Could not load the attendance report
      </p>
      <p className="max-w-xs text-[12px] leading-4 text-on-surface-variant">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12px] font-semibold text-on-primary transition-colors hover:bg-secondary"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}

function ChartEmpty({
  month,
  latestMonth,
  onLatest,
}: {
  month: string;
  latestMonth: string | null;
  onLatest: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/30 px-6 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-surface-container-low text-on-surface-variant">
        <CalendarDays className="size-5" aria-hidden="true" />
      </span>
      <p className="text-[14px] font-semibold leading-5 text-on-surface">
        No attendance recorded in {monthTitle(month)}
      </p>
      <p className="max-w-xs text-[12px] leading-4 text-on-surface-variant">
        The chart appears here after a teacher marks students in a class for
        this month.
      </p>
      {latestMonth && latestMonth !== month ? (
        <button
          type="button"
          onClick={onLatest}
          className="mt-2 rounded-full border border-primary/25 px-3.5 py-2 text-[12px] font-semibold text-primary transition-colors hover:bg-primary-container"
        >
          Go to latest month
        </button>
      ) : null}
    </div>
  );
}

export function MonthlyAttendanceChart() {
  const [month, setMonth] = useState<string | null>(null);
  const [report, setReport] = useState<MonthlyAttendanceReport | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const gradientPrefix = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();

  const plotRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const node = plotRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      setPlotWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const query = month ? `?date=${month}-01` : "";

    fetch(`/api/school/monthly-attendances${query}`, {
      cache: "no-store",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            body?.error ?? "The attendance report could not be loaded."
          );
        }

        return (await response.json()) as MonthlyAttendanceReport;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        setReport(data);
        setStatus("ready");
        setActiveIndex(null);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof Error ? cause.message : "Something went wrong."
        );
        setStatus("error");
      });

    return () => controller.abort();
  }, [month, reloadKey]);

  function loadMonth(next: string | null) {
    setStatus("loading");
    setError(null);
    setActiveIndex(null);
    setMonth(next);
    /* Always bump the request key: a failed month can leave `report` on the
       previous month, and retrying the same target must still refetch. */
    setReloadKey((key) => key + 1);
  }

  function retry() {
    setStatus("loading");
    setError(null);
    setActiveIndex(null);
    setReloadKey((key) => key + 1);
  }

  const activeMonth = report?.month ?? null;
  const canGoPrev = Boolean(
    activeMonth && report?.earliestMonth && activeMonth > report.earliestMonth
  );
  const canGoNext = Boolean(
    activeMonth && report?.latestMonth && activeMonth < report.latestMonth
  );

  function stepMonth(offset: -1 | 1) {
    if (!report) return;

    const target = shiftMonth(report.month, offset);

    if (offset < 0 && report.earliestMonth && target < report.earliestMonth) {
      return;
    }
    if (offset > 0 && report.latestMonth && target > report.latestMonth) {
      return;
    }

    /* Landing back on the latest month clears the override, so the next load
       is the default "latest" request rather than a pinned copy of it. */
    loadMonth(target === report.latestMonth ? null : target);
  }

  const days = report?.days ?? [];
  const plotW = Math.max(plotWidth - PAD.left - PAD.right, 0);
  const plotH = PLOT_HEIGHT - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotH;
  const stepX = days.length > 1 ? plotW / (days.length - 1) : 0;

  const xAt = (index: number) =>
    PAD.left + (days.length > 1 ? index * stepX : plotW / 2);
  const yAt = (value: number) => PAD.top + plotH * (1 - value / 100);

  const average = report?.averageAttendancePercentage ?? 0;
  const averageY = yAt(average);
  const averageLabelY = Math.min(
    baseline - 6,
    Math.max(PAD.top + 8, averageY - 7)
  );

  const activeDay = activeIndex !== null ? days[activeIndex] : undefined;
  const activeX = activeIndex !== null ? xAt(activeIndex) : 0;
  const tooltipHalfWidth = 86;
  const tooltipEdge =
    plotWidth > 0 ? (tooltipHalfWidth / plotWidth) * 100 : 14;
  const activeLeft =
    plotWidth > 0
      ? Math.min(
          100 - tooltipEdge,
          Math.max(tooltipEdge, (activeX / plotWidth) * 100)
        )
      : 50;

  const displayMonth = month ?? report?.month ?? null;

  const showChart = status === "ready" && report !== null && days.length > 0;
  const showEmpty = status === "ready" && report !== null && days.length === 0;

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-busy={status === "loading"}
        className="overflow-hidden rounded-xl border border-primary/10 bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]"
      >
        <div className="px-6 pb-2 pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-on-surface-variant">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: "var(--c-present)" }}
                  aria-hidden="true"
                />
                Attendance report
              </p>
              <h2 className="mt-2 text-[26px] font-semibold leading-[32px] tracking-[-0.02em] text-primary">
                {displayMonth ? monthTitle(displayMonth) : "Weekly rhythm"}
              </h2>
              <p className="mt-1 font-mono text-[11px] tabular-nums text-on-surface-variant">
                {status === "loading" ? (
                  "Loading month…"
                ) : status === "error" ? (
                  "Report unavailable"
                ) : report ? (
                  <>
                    {report.totals.sessionCount} sessions
                    <span className="mx-2 text-outline-variant">/</span>
                    {report.totals.totalCount} student marks
                  </>
                ) : (
                  "Fetching the latest month…"
                )}
              </p>
            </div>

            {report ? (
              <div className="flex items-center gap-2">
                {month !== null ? (
                  <button
                    type="button"
                    onClick={() => loadMonth(null)}
                    className="rounded-full border border-primary/20 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary-container"
                  >
                    Latest
                  </button>
                ) : null}

                <div className="flex items-center rounded-full border border-outline-variant/30 bg-surface-container-low p-1">
                  <button
                    type="button"
                    onClick={() => stepMonth(-1)}
                    disabled={!canGoPrev || status === "loading"}
                    aria-label="Previous month"
                    className="grid size-7 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <span
                    className="mx-0.5 h-4 w-px bg-outline-variant/30"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => stepMonth(1)}
                    disabled={!canGoNext || status === "loading"}
                    aria-label="Next month"
                    className="grid size-7 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary disabled:pointer-events-none disabled:opacity-30"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6">
          <div ref={plotRef} className="relative h-[300px] w-full">
            {status === "loading" ? (
              <>
                <p className="sr-only" role="status">
                  Loading attendance report
                </p>
                <ChartSkeleton />
              </>
            ) : null}

            {status === "error" ? (
              <ChartError
                message={error ?? "The attendance report could not be loaded."}
                onRetry={retry}
              />
            ) : null}

            {showEmpty && report ? (
              <ChartEmpty
                month={report.month}
                latestMonth={report.latestMonth}
                onLatest={() => loadMonth(null)}
              />
            ) : null}

            {showChart && report ? (
              <>
                {plotWidth > 0 ? (
                  <svg
                    width={plotWidth}
                    height={PLOT_HEIGHT}
                    className="block"
                    role="group"
                    aria-label={`Attendance by weekday for ${monthTitle(
                      report.month
                    )}. Present ${report.totals.presentPercentage} percent, late ${
                      report.totals.latePercentage
                    } percent, absent ${report.totals.absentPercentage} percent.`}
                  >
                    <defs>
                      {SERIES.map((series) => (
                        <linearGradient
                          key={series.key}
                          id={`${gradientPrefix}-${series.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={series.color}
                            stopOpacity={series.fillOpacity}
                          />
                          <stop
                            offset="100%"
                            stopColor={series.color}
                            stopOpacity={0.01}
                          />
                        </linearGradient>
                      ))}
                    </defs>

                    {Y_TICKS.map((value) => (
                      <g key={value}>
                        <line
                          x1={PAD.left}
                          x2={PAD.left + plotW}
                          y1={yAt(value)}
                          y2={yAt(value)}
                          stroke="var(--outline-variant)"
                          strokeOpacity={value === 0 ? 0.5 : 0.22}
                          strokeDasharray={value === 0 ? undefined : "2 6"}
                        />
                        <text
                          x={PAD.left - 10}
                          y={yAt(value)}
                          textAnchor="end"
                          dominantBaseline="middle"
                          fill="var(--on-surface-variant)"
                          fillOpacity={0.7}
                          className="font-mono text-[9px]"
                        >
                          {value}%
                        </text>
                      </g>
                    ))}

                    <text
                      x={PAD.left}
                      y={PAD.top - 12}
                      fill="var(--on-surface-variant)"
                      fillOpacity={0.55}
                      className="font-mono text-[9px] uppercase tracking-[0.18em]"
                    >
                      Share of marks
                    </text>

                    <motion.g
                      key={report.month}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.35 }}
                    >
                      {AREA_ORDER.map((key) => {
                        const points = days.map((day, index) => ({
                          x: xAt(index),
                          y: yAt(seriesValue(day, key)),
                        }));

                        return (
                          <path
                            key={`area-${key}`}
                            d={areaPath(points, baseline, PAD.top)}
                            fill={`url(#${gradientPrefix}-${key})`}
                          />
                        );
                      })}

                      {LINE_ORDER.map((key) => {
                        const points = days.map((day, index) => ({
                          x: xAt(index),
                          y: yAt(seriesValue(day, key)),
                        }));

                        return (
                          <motion.path
                            key={`line-${key}`}
                            d={smoothPath(points, PAD.top, baseline)}
                            fill="none"
                            stroke={`var(--c-${key})`}
                            strokeWidth={key === "present" ? 2.5 : 1.75}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={
                              reduceMotion
                                ? false
                                : { pathLength: 0, opacity: 0 }
                            }
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        );
                      })}
                    </motion.g>

                    <line
                      x1={PAD.left}
                      x2={PAD.left + plotW}
                      y1={averageY}
                      y2={averageY}
                      stroke="var(--on-surface-variant)"
                      strokeOpacity={0.35}
                      strokeDasharray="3 5"
                    />
                    <text
                      x={PAD.left + 6}
                      y={averageLabelY}
                      fill="var(--on-surface-variant)"
                      paintOrder="stroke"
                      stroke="var(--surface-container-lowest)"
                      strokeWidth={3}
                      className="font-mono text-[9px] font-semibold tracking-[0.08em]"
                    >
                      AVG {average.toFixed(1)}%
                    </text>

                    {days.map((day, index) => {
                      const ticks = Math.min(day.sessionCount, MAX_RUG_TICKS);
                      const gap = 2.5;
                      const start = xAt(index) - ((ticks - 1) * gap) / 2;

                      return (
                        <g key={`rug-${day.dayOfWeek}`}>
                          {Array.from({ length: ticks }, (_, tick) => (
                            <line
                              key={tick}
                              x1={start + tick * gap}
                              x2={start + tick * gap}
                              y1={baseline + 5}
                              y2={baseline + 10}
                              stroke="var(--outline)"
                              strokeOpacity={0.4}
                              strokeWidth={1}
                            />
                          ))}
                        </g>
                      );
                    })}

                    {days.map((day, index) => (
                      <text
                        key={`label-${day.dayOfWeek}`}
                        x={xAt(index)}
                        y={baseline + 30}
                        textAnchor="middle"
                        fill="var(--on-surface-variant)"
                        fillOpacity={activeIndex === index ? 1 : 0.7}
                        className="font-mono text-[10px] font-medium tracking-[0.12em]"
                      >
                        {DAY_LABELS[day.dayOfWeek]?.short.toUpperCase() ?? "—"}
                      </text>
                    ))}

                    {activeIndex !== null && activeDay ? (
                      <g pointerEvents="none">
                        <line
                          x1={activeX}
                          x2={activeX}
                          y1={PAD.top}
                          y2={baseline}
                          stroke="var(--outline)"
                          strokeOpacity={0.45}
                          strokeDasharray="2 4"
                        />
                        {SERIES.map((series) => (
                          <circle
                            key={series.key}
                            cx={activeX}
                            cy={yAt(seriesValue(activeDay, series.key))}
                            r={4}
                            fill="var(--surface-container-lowest)"
                            stroke={series.color}
                            strokeWidth={2.5}
                          />
                        ))}
                      </g>
                    ) : null}

                    {days.map((day, index) => {
                      const leftEdge =
                        index === 0
                          ? PAD.left
                          : (xAt(index - 1) + xAt(index)) / 2;
                      const rightEdge =
                        index === days.length - 1
                          ? PAD.left + plotW
                          : (xAt(index) + xAt(index + 1)) / 2;

                      return (
                        <rect
                          key={`hit-${day.dayOfWeek}`}
                          x={leftEdge}
                          y={PAD.top}
                          width={Math.max(rightEdge - leftEdge, 1)}
                          height={plotH}
                          fill="transparent"
                          tabIndex={0}
                          role="img"
                          aria-label={`${DAY_LABELS[day.dayOfWeek]?.long ?? "Day"}: ${day.presentPercentage}% present, ${day.latePercentage}% late, ${day.absentPercentage}% absent. ${day.sessionCount} sessions.`}
                          onPointerEnter={() => setActiveIndex(index)}
                          onPointerLeave={() => setActiveIndex(null)}
                          onFocus={() => setActiveIndex(index)}
                          onBlur={() => setActiveIndex(null)}
                          className="cursor-crosshair focus-visible:outline-none"
                        />
                      );
                    })}
                  </svg>
                ) : null}

                {activeDay ? (
                  <div
                    className="pointer-events-none absolute top-2 z-10 w-[172px] -translate-x-1/2 rounded-xl border border-outline-variant/30 bg-surface-container-lowest/95 p-3 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] backdrop-blur"
                    style={{ left: `${activeLeft}%` }}
                    aria-hidden="true"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[12px] font-semibold leading-4 text-on-surface">
                        {DAY_LABELS[activeDay.dayOfWeek]?.long ?? "Day"}
                      </p>
                      <p className="font-mono text-[9px] tabular-nums text-on-surface-variant">
                        {activeDay.sessionCount} SESS
                      </p>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {SERIES.map((series) => (
                        <div
                          key={series.key}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] leading-4 text-on-surface-variant">
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: series.color }}
                            />
                            {series.label}
                          </span>
                          <span className="font-mono text-[10px] tabular-nums text-on-surface">
                            {seriesValue(activeDay, series.key).toFixed(1)}%
                            <span className="ml-1 text-on-surface-variant/70">
                              {seriesCount(activeDay, series.key)}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        {showChart && report ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant/10 px-6 py-4">
            {SERIES.map((series) => (
              <span key={series.key} className="flex items-baseline gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span className="text-[12px] font-medium text-on-surface">
                  {series.label}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {totalValue(report, series.key).toFixed(1)}%
                </span>
                <span className="font-mono text-[10px] tabular-nums text-on-surface-variant/60">
                  {totalCount(report, series.key)}
                </span>
              </span>
            ))}
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
              {monthRange(report.month)}
            </span>
          </div>
        ) : null}
      </section>
    </MotionConfig>
  );
}
