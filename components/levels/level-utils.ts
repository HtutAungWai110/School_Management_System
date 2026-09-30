import type { Level } from "@/types/module.type"

/**
 * Module-type encoding. The brand petrol is deliberately absent — it is
 * the brand/action colour, so a petrol pill would read as "primary"
 * rather than "elective". Core takes slate because it is the most
 * numerous group and should be the quietest; choice takes blue, which
 * sits far enough from the brand petrol to stay distinct.
 */
export const TYPE_META = {
  core: {
    label: "Core",
    pill: "bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
    dot: "bg-slate-400 dark:bg-slate-500",
  },
  mandatory: {
    label: "Mandatory",
    pill: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  specialist: {
    label: "Specialist",
    pill: "bg-violet-50 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300",
    dot: "bg-violet-500",
  },
  elective: {
    label: "Elective",
    pill: "bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    dot: "bg-blue-500",
  },
} as const

export type TypeKey = keyof typeof TYPE_META

export const LEVEL_LABELS: Record<string, string> = {
  "3": "Undergraduate Foundation",
  "4": "Undergraduate Year 1",
  "5": "Undergraduate Year 2",
}

export function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function parseLevel(description: string) {
  const match = description.match(/\bLEVEL\s*(\d+)/i)
  const number = match?.[1] ?? null
  const title = description.replace(/\bLEVEL\s*\d+\s*/i, "").trim()
  return { number, title: title || description }
}

export interface ModuleEntry {
  required: string
  modules: { id: string; code: string; title: string }
}

export interface LevelRule {
  requiredCounts: Partial<Record<TypeKey, number>>
  electiveLimit: number
}

export const LEVEL_RULES: Record<string, LevelRule> = {
  "diploma in computing": { requiredCounts: { core: 5 }, electiveLimit: 0 },
  "diploma in computing with business management": {
    requiredCounts: { core: 4, mandatory: 3 },
    electiveLimit: 1,
  },
  "advanced diploma in computing": { requiredCounts: { specialist: 4 }, electiveLimit: 2 },
  "advanced diploma in computing with business management": {
    requiredCounts: { specialist: 4 },
    electiveLimit: 2,
  },
}

export function getLevelRule(description: string): LevelRule {
  const { number, title } = parseLevel(description)
  const key = `${number === "5" ? "advanced " : ""}${title}`.toLowerCase()
  return LEVEL_RULES[key] ?? { requiredCounts: {}, electiveLimit: 0 }
}

export function groupByRequired(level: Level) {
  const groups = new Map<string, { label: string; units: { id: string; code: string; title: string }[] }>()
  const order: string[] = []
  for (const entry of level.modules_level) {
    const meta = TYPE_META[entry.required as TypeKey] ?? TYPE_META.elective
    const key = meta.label
    let group = groups.get(key)
    if (!group) {
      group = { label: meta.label, units: [] }
      groups.set(key, group)
      order.push(key)
    }
    group.units.push({ id: entry.modules.id, code: entry.modules.code, title: entry.modules.title })
  }
  return order.map((key) => groups.get(key)!)
}
