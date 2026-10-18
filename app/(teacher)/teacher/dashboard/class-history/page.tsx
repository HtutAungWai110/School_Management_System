import Link from "next/link"
import { ChevronLeft, ChevronRight, CalendarDays, CircleHelp, MapPin } from "lucide-react"

import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { serverFetch } from "@/lib/server.service"
import { getModuleColorWithOpacity } from "@/lib/utils.util"
import type { ClassHistoryEntry, ClassHistoryResponse } from "@/types/attendance.type"

interface PageProps {
  searchParams: Promise<{ date?: string | string[] }>
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

/** Parses `YYYY-MM-DD` as a *local* calendar day.
 *
 *  `new Date("2026-10-01")` is parsed as UTC midnight, so anywhere west of
 *  Greenwich it lands on Sep 30 and the month nav steps to the wrong month. */
function parseLocalDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function toLocalDayString(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${m}-${d}`
}

function formatTime(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h, 10)
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${h12}:${m} ${hour >= 12 ? "PM" : "AM"}`
}

function formatDate(date: string): { weekday: string; label: string } {
  const d = parseLocalDay(date)
  if (!d) return { weekday: "", label: date }
  return {
    weekday: DAY_NAMES[(d.getDay() + 6) % 7] ?? "",
    label: d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
  }
}

export default async function ClassHistoryPage({ searchParams }: PageProps) {
  const params = await searchParams
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date
  const requested = rawDate ? parseLocalDay(rawDate) : null

  const query = requested ? `?date=${toLocalDayString(requested)}` : ""

  const history = (await serverFetch(
    `http://localhost:3000/api/teacher/class_history${query}`,
    { next: { revalidate: 60 } }
  ).then((res) => {
    if (!res.ok) throw new Error("Failed to load class history")
    return res.json()
  })) as ClassHistoryResponse

  const { finalData, minDate, maxDate, month } = history

  /* The service resolves the month, so the nav is always anchored to something
     real even when the request carried no date. */
  const viewing = (month ? parseLocalDay(month) : null) ?? new Date()
  const monthLabel = viewing.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const minMonth = minDate ? parseLocalDay(minDate) : null
  const maxMonth = maxDate ? parseLocalDay(maxDate) : null

  const atMinMonth =
    minMonth !== null &&
    (viewing.getFullYear() < minMonth.getFullYear() ||
      (viewing.getFullYear() === minMonth.getFullYear() && viewing.getMonth() <= minMonth.getMonth()))
  const atMaxMonth =
    maxMonth !== null &&
    (viewing.getFullYear() > maxMonth.getFullYear() ||
      (viewing.getFullYear() === maxMonth.getFullYear() && viewing.getMonth() >= maxMonth.getMonth()))

  function shiftMonth(delta: number) {
    const next = new Date(viewing.getFullYear(), viewing.getMonth() + delta, 1)
    return `/teacher/dashboard/class-history?date=${toLocalDayString(next)}`
  }

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Class History</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          {/* Month pager */}
          <div className="bg-surface-container-lowest rounded-xl border border-primary/10 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)] mb-8">
            <div className="p-6 border-b border-outline-variant/10">
              <div className="flex items-center justify-between gap-4">
                {atMinMonth ? (
                  <span className="p-2" aria-hidden="true" />
                ) : (
                  <Link
                    href={shiftMonth(-1)}
                    aria-label="Previous month"
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                )}

                <div className="text-center flex-1 min-w-0">
                  <div className="flex items-center justify-center gap-2">
                    <CalendarDays className="w-4 h-4 text-on-surface-variant" />
                    <h2 className="text-[16px] font-[600] leading-[24px] text-on-surface">
                      {monthLabel}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                    {finalData.length === 0
                      ? "No classes taught this month"
                      : `${finalData.length} class${finalData.length !== 1 ? "es" : ""} taught`}
                  </p>
                </div>

                {atMaxMonth ? (
                  <span className="p-2" aria-hidden="true" />
                ) : (
                  <Link
                    href={shiftMonth(1)}
                    aria-label="Next month"
                    className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </div>

            {/* Sessions taught */}
            {finalData.length === 0 ? (
              <div className="py-16 text-center">
                <CalendarDays className="mx-auto size-8 text-on-surface-variant/50" />
                <p className="mt-3 text-[14px] font-[600] leading-[20px] text-on-surface">
                  Nothing taught in {monthLabel}
                </p>
                <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
                  A class appears here once you check in and record attendance for it.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {finalData.map((entry: ClassHistoryEntry) => {
                  const session = entry.timetables
                  const moduleColor = getModuleColorWithOpacity(session?.module_id ?? "", 0.3)
                  const { weekday, label } = formatDate(entry.date)

                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap sm:gap-4 sm:px-6"
                    >
                      {/* When */}
                      <div className="flex w-[104px] shrink-0 items-baseline gap-2 sm:flex-col sm:items-start sm:gap-0">
                        <span className="text-[11px] font-[500] leading-[14px] text-on-surface-variant uppercase tracking-wider">
                          {weekday}
                        </span>
                        <span className="text-[13px] font-[600] leading-[18px] text-on-surface">
                          {label}
                        </span>
                      </div>

                      {/* Module */}
                      <div className="min-w-0 flex-1">
                        <span
                          className="inline-block max-w-full truncate rounded px-2 py-0.5 text-[11px] font-[700] leading-[14px] uppercase tracking-wide"
                          style={{ backgroundColor: moduleColor }}
                        >
                          {session?.modules?.code ?? "—"}
                        </span>
                        <span className="mt-1 block truncate text-[14px] font-[500] leading-[20px] text-on-surface">
                          {session?.modules?.title ?? "Unknown module"}
                        </span>
                      </div>

                      {/* Batch */}
                      <span className="w-full text-[13px] font-[500] leading-[18px] text-on-surface-variant sm:w-[160px] sm:shrink-0 sm:truncate">
                        {session?.batches?.batch_name ?? "—"}
                      </span>

                      {/* Classroom */}
                      <span className="flex items-center gap-1.5 text-[13px] font-[500] leading-[18px] text-on-surface-variant sm:w-[120px] sm:shrink-0">
                        <MapPin className="size-3.5 shrink-0" />
                        {session?.classes?.class_number ?? "—"}
                      </span>

                      {/* Time */}
                      <span className="text-[13px] font-[500] leading-[18px] text-on-surface-variant sm:w-[140px] sm:shrink-0">
                        {session
                          ? `${formatTime(session.start_time)} – ${formatTime(session.end_time)}`
                          : "—"}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}