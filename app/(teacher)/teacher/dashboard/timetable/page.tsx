import { TimetableSessionTable, type TimetableSession } from "@/components/teachers/timetable-session-table.component"
import { serverFetch } from "@/lib/server.service"

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function getTodayDayOfWeek() {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

export default async function TimetablePage() {
  const sessions = await serverFetch("http://localhost:3000/api/teacher/timetable", { next: { revalidate: 120 } })
    .then((res) => res.json()) as TimetableSession[]

  const todayDay = getTodayDayOfWeek()

  const todaySessions = sessions.filter((s) => s.day_of_week === todayDay)

  const upcomingSessions = sessions
    .filter((s) => s.day_of_week !== todayDay)
    .sort((a, b) => {
      const dayDiff = ((a.day_of_week - todayDay + 7) % 7) - ((b.day_of_week - todayDay + 7) % 7)
      if (dayDiff !== 0) return dayDiff
      return a.start_time.localeCompare(b.start_time)
    })

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
          {todaySessions.length > 0 && (
            <TimetableSessionTable
              title="Today"
              subtitle={`${dayNames[todayDay - 1]} — ${todaySessions.length} session${todaySessions.length !== 1 ? "s" : ""}`}
              sessions={todaySessions}
            />
          )}

          {upcomingSessions.length > 0 && (
            <TimetableSessionTable
              title="Upcoming"
              subtitle={`${upcomingSessions.length} session${upcomingSessions.length !== 1 ? "s" : ""} remaining`}
              sessions={upcomingSessions}
              showDay
            />
          )}

          {todaySessions.length === 0 && upcomingSessions.length === 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-primary/10 p-12 text-center shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
              <p className="text-[16px] font-[600] leading-[24px] text-on-surface">No sessions scheduled</p>
              <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">Your timetable is empty.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
