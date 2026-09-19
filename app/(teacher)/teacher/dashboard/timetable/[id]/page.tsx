import Link from "next/link"
import { TimetableSessionWrapper } from "@/components/teachers/timetable-session-wrapper.component"
import type { TimetableSession } from "@/components/teachers/timetable-session-table.component"
import { serverFetch } from "@/lib/server.service"
import type { Class } from "@/types/class.type"
import type { AttendanceCalendarResponse } from "@/types/attendance.type"

function getTodayDayOfWeek() {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

export default async function TimetableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [detail, attendanceData, classes] = await Promise.all([
    serverFetch(`http://localhost:3000/api/teacher/timetable/${id}`, { next: { revalidate: 60 } })
      .then((res) => res.json())
      .catch(() => null) as Promise<TimetableSession | null>,
    serverFetch(`http://localhost:3000/api/teacher/timetable/${id}/attendances`, { next: { revalidate: 60 } })
      .then((res) => res.json()) as Promise<AttendanceCalendarResponse>,
    serverFetch("http://localhost:3000/api/classes", { next: { revalidate: 120 } })
      .then((res) => res.json()) as Promise<Class[]>,
  ])

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex">
        <main className="flex-1 lg:ml-64">
          <div className="px-12 py-10 max-w-[1440px] mx-auto">
            <div className="bg-surface-container-lowest rounded-xl border border-primary/10 p-12 text-center">
              <p className="text-[16px] font-[600] leading-[24px] text-on-surface">Session not found</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const session: TimetableSession = { ...detail, batches: detail.batches as TimetableSession["batches"], modules: detail.modules as TimetableSession["modules"], profiles: detail.profiles as TimetableSession["profiles"] }
  const todayDay = getTodayDayOfWeek()
  const todaySessions = [session].filter((s) => s.day_of_week === todayDay)
  const upcomingSessions = [session].filter((s) => s.day_of_week !== todayDay)

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-5">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Timetable</h1>
            <div className="flex items-center gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <span className="font-label-md text-label-md">Help</span>
              </button>
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 relative">
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
              </button>
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto space-y-10">
          {todaySessions.length > 0 ? (
            <TimetableSessionWrapper
              title="Today"
              subtitle={`${todaySessions.length} session${todaySessions.length !== 1 ? "s" : ""} today`}
              sessions={todaySessions}
              classes={classes}
            />
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-primary/10 p-8 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
              <p className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">No today class</p>
            </div>
          )}

          {upcomingSessions.length > 0 && (
            <TimetableSessionWrapper
              title="Upcoming"
              subtitle={`${upcomingSessions.length} session${upcomingSessions.length !== 1 ? "s" : ""} remaining`}
              sessions={upcomingSessions}
              showDay
              classes={classes}
            />
          )}

          <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Attendance</h2>
              <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                {attendanceData.finalData.length} records
              </span>
            </div>
            {attendanceData.finalData.length > 0 ? (
              <div className="px-6 py-4 space-y-4">
                <div className="flex items-center gap-4 text-[12px] text-on-surface-variant">
                  {attendanceData.minDate && (
                    <span>From: {attendanceData.minDate}</span>
                  )}
                  {attendanceData.maxDate && (
                    <span>To: {attendanceData.maxDate}</span>
                  )}
                </div>
                {attendanceData.finalData.map((record, idx) => {
                  const dateKey = Object.keys(record.attendances)[0]
                  const students = dateKey ? record.attendances[dateKey] : []
                  return (
                    <div key={idx} className="border-b border-outline-variant/10 last:border-0 pb-4 last:pb-0">
                      <p className="text-[14px] font-[500] leading-[20px] text-on-surface mb-2">{dateKey}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {students.map((student) => (
                          <div key={student.student_id} className="flex items-center gap-2 bg-surface-container-low/50 rounded-lg px-3 py-2">
                            <span className="text-[12px] font-[500] leading-[16px] text-on-surface truncate">
                              {student.full_name ?? "Unknown"}
                            </span>
                            <span className={`ml-auto text-[10px] font-[600] leading-[14px] uppercase ${
                              student.status === "present" ? "text-green-600" : student.status === "absent" ? "text-error" : "text-on-surface-variant"
                            }`}>
                              {student.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">No attendance records</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
