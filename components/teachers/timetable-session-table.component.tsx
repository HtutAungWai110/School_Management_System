const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export interface TimetableSession {
  id: string
  batch_id: string
  module_id: string
  teacher_id: string
  class_id: string
  day_of_week: number
  start_time: string
  end_time: string
  status: string
  batches: {
    status: string
    batch_name: string
    count: number
  }
  modules: {
    code: string
    title: string
  }
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours, 10)
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${minutes} ${period}`
}

interface TimetableSessionTableProps {
  title: string
  subtitle: string
  sessions: TimetableSession[]
  showDay?: boolean
}

export function TimetableSessionTable({ title, subtitle, sessions, showDay = false }: TimetableSessionTableProps) {
  const headers = showDay
    ? ["Module", "Batch", "Students", "Day", "Time", "Status"]
    : ["Module", "Batch", "Students", "Time", "Status"]

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
        <h2 className="text-[20px] font-[600] leading-[28px] text-primary">{title}</h2>
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{subtitle}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-container-low">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-primary/10 hover:bg-surface-container-low transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-[14px] font-[600] leading-[20px] text-on-surface">{session.modules.code}</p>
                    <p className="text-[12px] leading-[16px] text-on-surface-variant">{session.modules.title}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{session.batches.batch_name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{session.batches.count}</span>
                </td>
                {showDay && (
                  <td className="px-6 py-4">
                    <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{dayNames[session.day_of_week - 1] ?? `Day ${session.day_of_week}`}</span>
                  </td>
                )}
                <td className="px-6 py-4">
                  <span className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">
                    {formatTime(session.start_time)} – {formatTime(session.end_time)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[12px] font-[500] leading-[16px] px-2 py-1 rounded-full ${
                    session.status === "ongoing"
                      ? "bg-primary-fixed/20 text-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {session.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
