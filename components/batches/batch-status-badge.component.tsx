import { cn } from "@/lib/utils.util"
import type { BatchStatus } from "@/types/batch.type"

export function BatchStatusBadge({
  status,
  className,
}: {
  status: BatchStatus | null
  className?: string
}) {
  const isCompleted = status === "completed"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-[600] leading-[16px]",
        isCompleted
          ? "bg-tertiary-fixed text-on-primary-fixed-variant"
          : "border border-secondary-container/60 bg-primary-fixed/50 text-on-background/10",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isCompleted ? "bg-on-primary-fixed-variant" : "bg-current opacity-60"
        )}
      />
      {isCompleted ? "Completed" : "Ongoing"}
    </span>
  )
}
