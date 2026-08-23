import { MoreHorizontal } from "lucide-react"

export function AdmissionRow({ initials, name, course, date, status, statusClass }: {
  initials: string
  name: string
  course: string
  date: string
  status: string
  statusClass: string
}) {
  return (
    <tr className="border-b border-primary/10 hover:bg-surface-container-low transition-colors group">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-surface-dim flex items-center justify-center font-bold text-on-surface-variant text-sm">{initials}</div>
          <span className="text-[16px] leading-[24px] text-on-surface">{name}</span>
        </div>
      </td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">{course}</td>
      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">{date}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-full text-[12px] font-[500] leading-[16px] ${statusClass}`}>{status}</span>
      </td>
      <td className="px-6 py-4">
        <MoreHorizontal className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
      </td>
    </tr>
  )
}
