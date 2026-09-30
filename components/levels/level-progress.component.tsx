import { cn } from "@/lib/utils.util"

const STEPS = [
  { num: "3", label: "Foundation" },
  { num: "4", label: "Year 1" },
  { num: "5", label: "Year 2" },
]

/**
 * Where this qualification sits on the RQF ladder.
 *
 * The levels really are ordered — RQF 3 → 4 → 5 is a progression, not a
 * taxonomy — so showing position is information. A student comparing
 * "Level 4 Diploma" against "Level 5 Diploma" needs to know these stack,
 * and that the one below them is the prerequisite step.
 */
export default function LevelProgress({ current }: { current: string }) {
  const currentIndex = STEPS.findIndex((s) => s.num === current)

  return (
    <ol className="flex items-center gap-1.5" aria-label="Qualification level progression">
      {STEPS.map((step, i) => {
        const state = currentIndex === -1 ? "unknown" : i < currentIndex ? "done" : i === currentIndex ? "current" : "ahead"

        return (
          <li key={step.num} className="flex items-center gap-1.5">
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold leading-4 transition-colors",
                state === "current" && "bg-primary text-primary-foreground",
                state === "done" && "bg-primary/10 text-primary",
                state === "ahead" && "bg-surface-container-low text-on-surface-variant",
                state === "unknown" && "bg-surface-container-low text-on-surface-variant"
              )}
            >
              <span className="font-mono tabular-nums">{step.num}</span>
              <span className={cn(state === "ahead" || state === "unknown" ? "hidden sm:inline" : "inline")}>
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className={cn("h-px w-4", i < currentIndex ? "bg-primary/40" : "bg-border")} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
