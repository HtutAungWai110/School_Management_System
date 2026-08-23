import { cn } from "@/lib/utils.util"
import {
  TIMETABLE_STATUS_LABELS,
  type TimetableStatus,
} from "@/types/timetable.type"

const STATUS_STYLES: Record<TimetableStatus, string> = {
  ongoing: "bg-green-100 text-green-800 border-green-200",
  "on break": "bg-yellow-100 text-yellow-800 border-yellow-300",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
}

export function TimetableStatusBadge({
  status,
  className,
}: {
  status: TimetableStatus | null
  className?: string
}) {
  if (!status) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-[600] leading-[13px]",
        STATUS_STYLES[status] ?? STATUS_STYLES.ongoing,
        className
      )}
    >
      <span className="size-1 rounded-full bg-current opacity-60" />
      {TIMETABLE_STATUS_LABELS[status] ?? status}
    </span>
  )
}
