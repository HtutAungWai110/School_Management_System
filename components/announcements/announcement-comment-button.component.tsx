"use client"

import { MessageCircle } from "lucide-react"

import { cn } from "@/lib/utils.util"

/**
 * Toggles the thread below the post. The count is owned by the discussion so a
 * new comment can update it without a server refresh.
 */
export function AnnouncementCommentButton({
  count,
  expanded,
  controls,
  onToggle,
}: {
  count: number
  expanded: boolean
  controls: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controls}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        expanded ? "text-primary" : "text-on-surface hover:text-primary"
      )}
    >
      <MessageCircle className="size-6" strokeWidth={1.75} aria-hidden="true" />
      <span className="text-[13px] font-[600] leading-[18px] tabular-nums">{count}</span>
      <span className="sr-only">{count === 1 ? "comment" : "comments"}</span>
    </button>
  )
}
