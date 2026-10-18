import Link from "next/link"
import { ArrowLeft, CircleHelp, CalendarCheck, Users } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { StatusBadge } from "@/components/attendances/attendance-student-table.component"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { AttendanceSession, AttendanceStudent } from "@/types/attendance.type"

interface PageProps {
  /** The attendance id a notification link carries. */
  searchParams: Promise<{ id?: string }>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function counts(students: AttendanceStudent[]) {
  return {
    present: students.filter((s) => s.status === "present").length,
    late: students.filter((s) => s.status === "late").length,
    absent: students.filter((s) => s.status === "absent").length,
  }
}

function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest px-6 py-16 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <CalendarCheck className="mx-auto size-8 text-on-surface-variant/50" />
      <div className="mt-3 text-[14px] leading-5 text-on-surface-variant">{children}</div>
    </div>
  )
}

/**
 * Admin landing page for a single attendance record.
 *
 * Reached from a teacher's check-in notification, which links here with
 * `?id=<attendance_id>`. Intentionally left out of the sidebar: the record is
 * only meaningful once a session exists, and it is opened from the
 * notification that announces one.
 */
export default async function AdminAttendancesPage({ searchParams }: PageProps) {
  const { id } = await searchParams
  const attendanceId = id?.trim() ?? ""

  let session: AttendanceSession | null = null
  let failed = false

  if (attendanceId) {
    const response = await serverFetch(
      `http://localhost:3000/api/attendances/single/${encodeURIComponent(attendanceId)}`,
      { cache: "no-store" }
    )

    if (response.ok) {
      session = (await response.json()) as AttendanceSession
    } else {
      /* Distinguishes "no link" from "that record is gone", which are very
         different things to a reader who just followed a notification. */
      failed = true
    }
  }

  /* Newest first: the notification that brought someone here is about today. */
  const datedGroups = session
    ? Object.entries(session.attendances).sort(([a], [b]) => b.localeCompare(a))
    : []

  // Not named `module`: Next.js reserves that identifier.
  const subject = session?.modules
  const teacher = session?.profiles
  const timeRange = session
    ? `${session.start_time.slice(0, 5)}–${session.end_time.slice(0, 5)}`
    : ""

  return (
    /* `lg:ml-64` clears the fixed admin rail, matching every other admin page. */
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-auto sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Attendances</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10 space-y-6">
          <Link
            href="/admin/dashboard/overview"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium leading-5 text-on-surface-variant transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-3.5" />
            Back to overview
          </Link>

          {!attendanceId ? (
            <EmptyNotice>
              Open a session from a check-in notification to review its attendance.
            </EmptyNotice>
          ) : failed ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-6 py-12 text-center">
              <p className="text-[14px] leading-5 text-destructive">
                We couldn&apos;t load that attendance record. It may have been removed.
              </p>
            </div>
          ) : (
            <>
              <section className="rounded-xl border border-primary/10 bg-surface-container-lowest p-6 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="shrink-0 rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 text-primary">
                        {subject?.code ?? "—"}
                      </span>
                      <h2 className="text-[20px] font-[600] leading-[28px] text-on-surface">
                        {subject?.title ?? "Unknown module"}
                      </h2>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-5 text-on-surface-variant">
                      {[
                        session?.batches?.batch_name,
                        teacher?.full_name,
                        session?.day_of_week ? DAY_OF_WEEK_LABELS[session.day_of_week] : undefined,
                        timeRange,
                        session?.classes?.class_number
                          ? `Class ${session.classes.class_number}`
                          : undefined,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  <Link
                    href={`/teacher/dashboard/timetable/${session?.id}`}
                    className="shrink-0 text-[13px] font-medium leading-5 text-on-surface-variant underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    Open session
                  </Link>
                </div>
              </section>

              {datedGroups.length === 0 ? (
                <EmptyNotice>
                  This session has no attendance rows recorded yet.
                </EmptyNotice>
              ) : (
                datedGroups.map(([date, students]) => {
                  const tally = counts(students)

                  return (
                    <section
                      key={date}
                      className="overflow-hidden rounded-xl border border-primary/10 bg-surface-container-lowest shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/10 px-6 py-4">
                        <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">
                          {formatDate(date)}
                        </h3>
                        <div className="flex items-center gap-4 font-mono text-[11px] leading-4 tabular-nums">
                          <span className="text-green-700">{tally.present} present</span>
                          <span className="text-yellow-700">{tally.late} late</span>
                          <span className="text-red-700">{tally.absent} absent</span>
                          <span className="inline-flex items-center gap-1 text-on-surface-variant">
                            <Users className="size-3.5" />
                            {students.length}
                          </span>
                        </div>
                      </div>

                      <ul className="divide-y divide-outline-variant/10">
                        {[...students]
                          .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""))
                          .map((student) => (
                            <li key={student.id} className="flex items-center gap-3 px-6 py-3">
                              <span className="min-w-0 flex-1 truncate text-[14px] leading-5 text-on-surface">
                                {student.full_name ?? "Unknown student"}
                              </span>
                              {student.remark && (
                                <span className="hidden truncate text-[12px] leading-4 text-on-surface-variant sm:block">
                                  {student.remark}
                                </span>
                              )}
                              <StatusBadge status={student.status} />
                            </li>
                          ))}
                      </ul>
                    </section>
                  );
                })
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}