import { cn } from "@/lib/utils.util"
import type { BatchStatus } from "@/types/batch.type"

const STATUS_STYLES: Record<BatchStatus, string> = {
  ongoing: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
}

export function BatchStatusBadge({
  status,
  className,
}: {
  status: BatchStatus | null
  className?: string
}) {
  if (!status) return null

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-[600] leading-[16px]",
        STATUS_STYLES[status] ?? STATUS_STYLES.ongoing,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" />
      {status === "completed" ? "Completed" : "Ongoing"}
    </span>
  )
}
