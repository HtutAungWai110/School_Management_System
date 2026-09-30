import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey } from "./level-utils"

export default function RequirementLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
        Module types
      </span>
      {(Object.entries(TYPE_META) as [TypeKey, (typeof TYPE_META)[TypeKey]][]).map(([key, meta]) => (
        <span
          key={key}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
            meta.pill
          )}
        >
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      ))}
    </div>
  )
}
