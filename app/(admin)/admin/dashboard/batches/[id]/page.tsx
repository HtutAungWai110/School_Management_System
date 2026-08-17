import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Bell, Calendar, CircleHelp, Users, Clock } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import type { Batch } from "@/types/batch.type"
import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatTime(time: string) {
  return time.slice(0, 5)
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const res = await serverFetch(`http://localhost:3000/api/batches/${id}`, { next: { revalidate: 120 } });
  const json = await res.json();
  const batch = json?.data as Batch | null;

  const levels = batch?.batch_level ?? [];
  const students = batch?.batch_assignments ?? [];
  const timetables = batch?.timetables ?? [];

  const timeSlots = [...new Map(
    timetables.map(s => [`${s.start_time}-${s.end_time}`, { start: s.start_time, end: s.end_time }])
  ).values()].sort((a, b) => a.start.localeCompare(b.start));

  const activeDays = [...new Set(timetables.map(s => s.day_of_week))].sort((a, b) => a - b);

  const timetableCellMap = new Map<string, typeof timetables>();
  for (const s of timetables) {
    const key = `${s.day_of_week}_${s.start_time}_${s.end_time}`;
    const arr = timetableCellMap.get(key) ?? [];
    arr.push(s);
    timetableCellMap.set(key, arr);
  }

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Batch Details</h1>
            <div className="flex items-center gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <Link
            href="/admin/dashboard/batches"
            className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant hover:text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </Link>

          {!batch ? (
            <div className="mt-8 rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
              <Users className="mx-auto size-8 text-on-surface-variant" />
              <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">Batch not found</p>
              <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                This batch may have been deleted or never existed.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {timetables.length > 0 && (
                <div className="lg:col-span-3 bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-tertiary-fixed flex items-center justify-center shrink-0">
                        <Clock className="w-[18px] h-[18px] text-on-primary-fixed-variant" />
                      </div>
                      <div>
                        <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Timetable</h3>
                        <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                          {timetables.length} session{timetables.length === 1 ? "" : "s"} across{" "}
                          {activeDays.length} day{activeDays.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[560px]">
                      <thead>
                        <tr className="bg-surface-container-low">
                          <th className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider text-left border-b border-r border-outline-variant/10 w-[120px]">
                            Day
                          </th>
                          {timeSlots.map((ts) => (
                            <th
                              key={`${ts.start}-${ts.end}`}
                              className="px-3 py-3 text-center border-b border-r border-outline-variant/10 last:border-r-0"
                            >
                              <span className="block text-[13px] font-[600] leading-[18px] text-on-surface tabular-nums">
                                {formatTime(ts.start)}–{formatTime(ts.end)}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeDays.map((day) => (
                          <tr key={day}>
                            <td className="sticky left-0 z-10 bg-surface-container-low px-4 py-3 text-[13px] font-[600] leading-[18px] text-on-surface whitespace-nowrap border-r border-b border-outline-variant/10">
                              {DAY_OF_WEEK_LABELS[day]}
                            </td>
                            {timeSlots.map((ts) => {
                              const key = `${day}_${ts.start}_${ts.end}`;
                              const sessions = timetableCellMap.get(key) ?? [];
                              return (
                                <td
                                  key={key}
                                  className={`px-2 py-2 border-b border-r border-outline-variant/10 last:border-r-0 align-top min-h-[64px] ${
                                    sessions.length === 0 ? "bg-surface-container-low/10" : ""
                                  }`}
                                >
                                  {sessions.length > 0 && (
                                    <div className="space-y-1.5">
                                      {sessions.map((session) => (
                                        <div
                                          key={session.id}
                                          className="rounded-lg bg-primary-fixed/20 border border-secondary-container/40 px-2.5 py-2"
                                        >
                                          <p className="text-[12px] font-[600] leading-[16px] text-on-surface truncate">
                                            {session.modules?.code ?? "—"}
                                          </p>
                                          <p className="text-[11px] leading-[14px] text-on-surface-variant truncate">
                                            {session.modules?.title}
                                          </p>
                                          <p className="text-[11px] leading-[14px] text-on-surface-variant truncate">
                                            {session.profiles?.full_name ?? "—"}
                                          </p>
                                          {(session.classes?.class_number || session.classes?.location) && (
                                            <p className="text-[10px] leading-[13px] text-on-surface-variant/70 truncate">
                                              {session.classes?.class_number
                                                ? `Class ${session.classes.class_number}`
                                                : session.classes?.location}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="lg:col-span-1 space-y-6">
                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-on-primary-fixed-variant" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Batch name
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <h2 className="truncate text-[20px] font-[700] leading-[28px] text-on-surface">
                          {batch.batch_name}
                        </h2>
                        <BatchStatusBadge status={batch.status ?? null} />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center gap-2 text-on-surface-variant">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[13px] font-[500] leading-[18px]">
                      Created {formatDate(batch.created_at)}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 border-b border-outline-variant/10">
                    <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Levels</h3>
                    <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                      The levels covered by this batch.
                    </p>
                  </div>
                  <div className="p-6">
                    {levels.length === 0 ? (
                      <p className="text-[14px] leading-[20px] text-on-surface-variant">No levels assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {levels.map((bl) => (
                          <span
                            key={bl.id}
                            className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
                          >
                            {bl.levels.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Assigned Students</h3>
                    <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                      {students.length} student{students.length === 1 ? "" : "s"} in this batch
                    </p>
                  </div>
                </div>
                {students.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Users className="mx-auto size-8 text-on-surface-variant/70" />
                    <p className="mt-4 text-[14px] font-[600] leading-[20px] text-on-surface">
                      No students assigned yet
                    </p>
                    <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
                      Assign students to this batch from the Enrollments page.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-outline-variant/10">
                    {students.map((assignment) => {
                      const profile = assignment.profiles;
                      if (!profile) return null;
                      return (
                        <li key={assignment.id} className="px-6 py-4 flex items-center gap-4">
                          {profile.avatar_url ? (
                            <Image
                              className="w-10 h-10 rounded-full object-cover border border-outline-variant/20"
                              src={profile.avatar_url}
                              alt={profile.full_name}
                              width={40}
                              height={40}
                              unoptimized
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-on-surface-variant text-sm shrink-0">
                              {getInitials(profile.full_name)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-[600] leading-[20px] text-on-surface truncate">
                              {profile.full_name}
                            </p>
                            <p className="text-[13px] leading-[18px] text-on-surface-variant truncate">
                              {profile.email}
                            </p>
                            {profile.student_enrollments && profile.student_enrollments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {profile.student_enrollments.map((enrollment) =>
                                  enrollment.modules ? (
                                    <span
                                      key={enrollment.modules.id}
                                      className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-secondary-container/60 text-[11px] font-[600] leading-[14px]"
                                    >
                                      {enrollment.modules.code}
                                      <span className="text-on-surface-variant font-[500]">
                                        {enrollment.modules.title}
                                      </span>
                                    </span>
                                  ) : null
                                )}
                              </div>
                            )}
                          </div>
                          <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant shrink-0">
                            Added {formatDate(assignment.assigned_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center px-12 py-6 w-full max-w-[1440px] mx-auto">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">CodePoint Academy</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">© 2024 ScholarlyAdmin School Management System</span>
            </div>
            <div className="flex gap-6">
              {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
                <a key={link} href="#" className="text-[12px] font-[500] leading-[16px] text-on-surface-variant hover:text-primary transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
