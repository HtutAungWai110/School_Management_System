import type { ModuleLevel } from "@/types/module.type"

export const requiredBadgeClass: Record<string, string> = {
  core: "bg-primary-fixed/50 text-on-primary-fixed-variant border-primary/20",
  elective: "bg-secondary-container/30 text-secondary border-secondary-container",
  mandatory: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border-tertiary/20",
  specialist: "bg-surface-container text-on-surface-variant border-outline-variant/30",
}

export function ModulesLevelTemplate({ modulesLevel }: {
  modulesLevel: ModuleLevel[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {modulesLevel.map((ml) => (
        <span
          key={ml.levels.id}
          className={`px-2.5 py-0.5 rounded-full border text-[12px] font-[500] leading-[16px] ${requiredBadgeClass[ml.required] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"}`}
        >
          {ml.levels.description} · {ml.required}
        </span>
      ))}
    </div>
  )
}
