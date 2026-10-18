import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { TimetableSessionDetail } from "@/components/teachers/timetable-session-detail.component"
import type { TimetableSession } from "@/components/teachers/timetable-session-table.component"
import { serverFetch } from "@/lib/server.service"
import type { Class } from "@/types/class.type"
import { BatchAttendancePanel } from "@/components/attendances/attendance-panel.component"
import TodayAttendancePanel from "@/components/attendances/today-attendance-panel.component"

export default async function TimetableDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [detail, classes] = await Promise.all([
    serverFetch(`http://localhost:3000/api/teacher/timetable/${id}`, { next: { revalidate: 60 } })
      .then((res) => res.json())
      .catch(() => null) as Promise<TimetableSession | null>,
    serverFetch("http://localhost:3000/api/classes", { next: { revalidate: 120 } })
      .then((res) => res.json()) as Promise<Class[]>,
  ])

  if (!detail) {
    return (
      <div className="min-h-screen bg-background flex">
        <main className="min-w-0 flex-1 lg:ml-64">
          <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
            <div className="bg-surface-container-lowest rounded-xl border border-primary/10 p-12 text-center">
              <p className="text-[16px] font-[600] leading-[24px] text-on-surface">Session not found</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const session: TimetableSession = { ...detail, batches: detail.batches as TimetableSession["batches"], modules: detail.modules as TimetableSession["modules"], profiles: detail.profiles as TimetableSession["profiles"] }

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Timetable</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <span className="font-label-md text-label-md">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10 space-y-10">
          <TimetableSessionDetail session={session} classes={classes} />

          <TodayAttendancePanel
            timetable_id={id}
            module_id={session.module_id}
            batch_id={session.batch_id}
            day_of_week={session.day_of_week}
          />

          <BatchAttendancePanel timetableId={id} />
        </div>
      </main>
    </div>
  )
}
