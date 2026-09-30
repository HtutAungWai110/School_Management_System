import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey } from "./level-utils"

export default function ModuleCard({
  code,
  title,
  required,
  brief,
}: {
  code: string
  title: string
  required: string
  brief?: string
}) {
  const meta = TYPE_META[required as TypeKey] ?? TYPE_META.elective

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]">
      <div className="flex items-start justify-between gap-3">
        {/* The module code is the identifier a student actually cites — in
            timetable queries, transcripts, emails to admissions. Set it in a
            real mono at a scannable size so a column of codes aligns, rather
            than demoting it to 12px gray body text. */}
        <span
          data-numeric
          className="font-mono text-[12px] font-medium leading-4 tracking-wide text-primary"
        >
          {code}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-4",
            meta.pill
          )}
        >
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>

      <div className="mt-3 flex-1">
        <h3 className="text-[15px] font-semibold leading-6 text-foreground">{title}</h3>
        {brief && (
          <p className="mt-1.5 text-[13px] leading-5 text-on-surface-variant text-pretty">{brief}</p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-3.5">
        <span data-numeric className="text-[12px] font-medium text-on-surface-variant">
          12 Credits
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Syllabus
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </article>
  )
}
