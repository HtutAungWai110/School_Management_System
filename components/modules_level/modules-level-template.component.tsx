import type { ModuleLevel } from "@/types/module.type"



export function ModulesLevelTemplate({ modulesLevel }: {
  modulesLevel: ModuleLevel[]
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {modulesLevel.map((ml) => (
        <span
          key={ml.levels.id}
          className={`px-2.5 py-0.5 rounded-full border text-[12px] font-[500] leading-[16px] text-on-background/10 bg-primary-fixed/50`}
        >
          {ml.levels.description} · {ml.required}
        </span>
      ))}
    </div>
  )
}
