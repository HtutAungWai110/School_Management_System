import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey } from "./level-utils"

export default function ModuleCard({ code, title, required }: { code: string; title: string; required: string }) {
  const meta = TYPE_META[required as TypeKey] ?? TYPE_META.elective
  return (
    <article className="group p-4 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[12px] font-[500] tracking-wide text-primary bg-surface-container-low px-2 py-0.5 rounded">
            {code}
          </span>
          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px]", meta.pill)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        </div>
        <div>
          <h3 className="text-[18px] font-[600] leading-[24px] text-on-surface group-hover:text-primary transition-colors">
            {title}
          </h3>
        </div>
      </div>
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-high/30">
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">12 Credits</span>
        <button type="button" className="inline-flex items-center gap-1 text-[14px] font-[500] leading-[20px] text-primary hover:text-secondary transition-colors">
          <span>Syllabus</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </article>
  )
}
