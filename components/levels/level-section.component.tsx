import { Terminal, Code, GraduationCap } from "lucide-react"

import { LEVEL_LABELS, type ModuleEntry } from "./level-utils"
import LevelProgress from "./level-progress.component"
import ModuleCard from "./module-card.component"
import EnrollCoursePanel from "./enroll-course-panel.component"

export function LevelIcon({ num }: { num: string }) {
  const Icon = num === "3" ? Terminal : num === "4" ? Code : GraduationCap
  return <Icon className="w-5 h-5" />
}

export default function LevelSection({
  level,
  levelLabel,
  brief,
  moduleBriefs,
}: {
  level: { id: string; description: string; modules_level: ModuleEntry[] }
  levelLabel: string
  brief?: string
  moduleBriefs: Record<string, string>
}) {
  const num = levelLabel
  const totalModules = level.modules_level.length
  const groups = [
    { label: "Core", count: level.modules_level.filter((m) => m.required === "core").length },
    { label: "Mandatory", count: level.modules_level.filter((m) => m.required === "mandatory").length },
    { label: "Specialist", count: level.modules_level.filter((m) => m.required === "specialist").length },
    { label: "Elective", count: level.modules_level.filter((m) => m.required === "elective").length },
  ].filter((g) => g.count > 0)
  const breakdown = groups.map((g) => `${g.count} ${g.label}${g.count === 1 ? "" : "s"}`).join(" · ")

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <LevelProgress current={num} />
            <h2 className="mt-3 text-[20px] font-bold leading-7 tracking-tight text-foreground">
              {level.description}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-on-surface-variant">
              {LEVEL_LABELS[num] ?? `Level ${num}`}
            </p>
            {brief && (
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-on-surface-variant text-pretty">
                {brief}
              </p>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:flex-col lg:items-end lg:gap-3">
            <div className="flex items-center gap-3">
              <div className="sm:text-right">
                <p data-numeric className="text-[14px] font-semibold leading-5 text-foreground">
                  {totalModules} modules
                </p>
                <p className="text-[12px] leading-4 text-on-surface-variant">{breakdown}</p>
              </div>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <LevelIcon num={num} />
              </span>
            </div>

          </div>
        </div>
        <div className="w-full">
          <EnrollCoursePanel level={level} />
        </div>

      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {level.modules_level.map((entry) => (
          <ModuleCard
            key={entry.modules.id}
            code={entry.modules.code}
            title={entry.modules.title}
            required={entry.required}
            brief={moduleBriefs[entry.modules.code]}
          />
        ))}
      </div>
    </section>
  )
}
