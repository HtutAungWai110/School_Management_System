import { Clock, MapPin, Timer, UserRound } from "lucide-react"

import type { OverviewSession } from "@/types/student-overview.type"
import {
  DAY_LABELS,
  durationLabel,
  formatTime12,
  roomLabel,
  toMinutes,
  todayRqfDay,
} from "./overview-helpers"

/**
 * The one thing a student opens this page for. Everything else is context
 * for it, so it stays visually dominant.
 */
export default function OverviewNextSession({
  sessions,
  now,
}: {
  sessions: OverviewSession[]
  now: Date
}) {
  const today = todayRqfDay(now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const next = (() => {
    for (let offset = 0; offset < 8; offset++) {
      const day = ((today - 1 + offset) % 7) + 1
      const onDay = sessions.filter((session) => session.day_of_week === day)
      if (onDay.length === 0) continue

      if (offset === 0) {
        const upcoming = onDay.find((session) => toMinutes(session.end_time) > nowMinutes)
        if (!upcoming) continue
        const startsIn = toMinutes(upcoming.start_time) - nowMinutes
        const hours = Math.floor(startsIn / 60)
        const minutes = startsIn % 60
        return {
          session: upcoming,
          isToday: true,
          timing:
            startsIn <= 0
              ? "In progress now"
              : `Starts in ${hours ? `${hours}h` : ""}${minutes ? ` ${minutes}m` : ""}`.trim(),
        }
      }
      return { session: onDay[0], isToday: false, timing: offset === 1 ? "Tomorrow" : DAY_LABELS[day] }
    }
    return null
  })()

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-primary">Next session</h2>
        {next && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 text-[12px] font-medium text-on-primary-container">
            <Clock className="size-3.5" />
            {next.timing}
          </span>
        )}
      </div>

      <div className="p-6">
        {!next ? (
          <p className="text-[14px] text-on-surface-variant">
            No sessions are scheduled. Your timetable appears here once a batch is assigned.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span data-numeric className="font-mono text-[13px] font-medium tracking-wide text-primary">
                  {next.session.modules?.code ?? "—"}
                </span>
                <h3 className="mt-1 text-[20px] font-bold leading-7 tracking-tight text-primary">
                  {next.session.modules?.title ?? "Untitled module"}
                </h3>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p data-numeric className="font-mono text-[15px] font-medium text-primary">
                  {formatTime12(next.session.start_time)}
                  <span className="text-primary/70">
                    {" "}– {formatTime12(next.session.end_time)}
                  </span>
                </p>
                <p className="mt-0.5 text-[13px] text-primary/70">
                  {next.isToday ? "Today" : next.timing} · {durationLabel(next.session)}
                </p>
              </div>
            </div>

            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-[13px]">
              {next.session.batches?.batch_name && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Batch</dt>
                  <dd className="text-primary">{next.session.batches.batch_name}</dd>
                </div>
              )}
              {roomLabel(next.session) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary/70" />
                  <dt className="sr-only">Room</dt>
                  <dd className="text-primary">{roomLabel(next.session)}</dd>
                </div>
              )}
              {next.session.profiles?.full_name && (
                <div className="flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-primary/70" />
                  <dt className="sr-only">Teacher</dt>
                  <dd className="text-primary">{next.session.profiles.full_name}</dd>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Timer className="size-3.5 text-primary/70" />
                <dt className="sr-only">Duration</dt>
                <dd className="text-primary">{durationLabel(next.session)} hours</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </section>
  )
}