import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey } from "./level-utils"

export default function RequirementLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[14px] font-[500] text-on-surface-variant">
      <span className="text-[12px] uppercase tracking-wider text-outline font-[600] mr-1">Types:</span>
      {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META.core][]).map(([key, meta]) => (
        <span key={key} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded", meta.pill)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      ))}
    </div>
  )
}
