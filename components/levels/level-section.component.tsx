import { Terminal, Code, GraduationCap } from "lucide-react"

import { LEVEL_LABELS, type ModuleEntry } from "./level-utils"
import ModuleCard from "./module-card.component"
import EnrollCoursePanel from "./enroll-course-panel.component"

export function LevelIcon({ num }: { num: string }) {
  const Icon = num === "3" ? Terminal : num === "4" ? Code : GraduationCap
  return <Icon className="w-5 h-5" />
}

export default function LevelSection({
  level,
  levelLabel,
}: {
  level: { id: string; description: string; modules_level: ModuleEntry[] }
  levelLabel: string
}) {
  const num = levelLabel
  const totalModules = level.modules_level.length
  const groups = [
    { label: "Core", count: level.modules_level.filter((m) => m.required === "core").length },
    { label: "Mandatory", count: level.modules_level.filter((m) => m.required === "mandatory").length },
    { label: "Specialist", count: level.modules_level.filter((m) => m.required === "specialist").length },
    { label: "Elective", count: level.modules_level.filter((m) => m.required === "elective").length },
  ].filter((g) => g.count > 0)
  const breakdown = groups.map((g) => `${g.count} ${g.label}${g.count === 1 ? "" : "s"}`).join(" • ")

  return (
    <section className="diploma-section space-y-4">
      <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px] bg-primary-fixed text-on-primary-fixed">
              {LEVEL_LABELS[num] ?? `Level ${num}`}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px] bg-surface-container text-on-surface-variant">
              RQF Level {num}
            </span>
          </div>
          <h2 className="text-[22px] font-[600] leading-[28px] text-on-surface tracking-tight">
            {level.description}
          </h2>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="text-right hidden sm:block">
            <div className="text-[14px] font-[500] leading-[20px] text-on-surface">{totalModules} Total Modules</div>
            <div className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{breakdown}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
            <LevelIcon num={num} />
          </div>
        </div>
      </div>
      <EnrollCoursePanel level={level} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {level.modules_level.map((entry) => (
          <ModuleCard key={entry.modules.id} code={entry.modules.code} title={entry.modules.title} required={entry.required} />
        ))}
      </div>
    </section>
  )
}
