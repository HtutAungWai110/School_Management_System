"use client"

import { useState, useMemo } from "react"
import { Search, X, ArrowRight, BadgeCheck, Terminal, Code, GraduationCap } from "lucide-react"

import { cn } from "@/lib/utils.util"
import type { Level } from "@/types/module.type"

const TYPE_META = {
  core: {
    label: "Core",
    pill: "bg-secondary-fixed text-on-secondary-fixed",
    dot: "bg-secondary",
  },
  mandatory: {
    label: "Mandatory",
    pill: "bg-amber-100 text-amber-900",
    dot: "bg-amber-600",
  },
  specialist: {
    label: "Specialist",
    pill: "bg-purple-100 text-purple-900",
    dot: "bg-purple-600",
  },
  elective: {
    label: "Elective",
    pill: "bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-600",
  },
} as const

type TypeKey = keyof typeof TYPE_META

const LEVEL_LABELS: Record<string, string> = {
  "3": "Foundation Level",
  "4": "Undergraduate Year 1",
  "5": "Advanced Level",
}

function LevelIcon({ num }: { num: string }) {
  const Icon = num === "3" ? Terminal : num === "4" ? Code : GraduationCap
  return <Icon className="w-5 h-5" />
}

function parseLevel(description: string) {
  const match = description.match(/\bLEVEL\s*(\d+)/i)
  const number = match?.[1] ?? null
  const title = description.replace(/\bLEVEL\s*\d+\s*/i, "").trim()
  return { number, title: title || description }
}

export default function LevelsCatalog({ initialLevels }: { initialLevels: Level[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>("All")

  const levelOptions = useMemo(() => {
    const seen: string[] = []
    for (const level of initialLevels) {
      const { number } = parseLevel(level.description)
      if (number && !seen.includes(number)) seen.push(number)
    }
    return seen
  }, [initialLevels])

  const tabs = useMemo(() => {
    const allCount = initialLevels.reduce((s, l) => s + l.modules_level.length, 0)
    const items: { label: string; key: string; count: number }[] = [
      { label: `All Programs (${allCount})`, key: "All", count: allCount },
    ]
    for (const num of levelOptions) {
      const level = initialLevels.find((l) => parseLevel(l.description).number === num)
      const count = level ? level.modules_level.length : 0
      const { title } = parseLevel(level?.description ?? "")
      items.push({ label: `Level ${num} ${title} (${count})`, key: `l${num}`, count })
    }
    return items
  }, [initialLevels, levelOptions])

  const visibleLevels = useMemo(() => {
    const levels =
      filter === "All"
        ? initialLevels
        : initialLevels.filter((l) => parseLevel(l.description).number === filter.replace("l", ""))
    if (!query.trim()) return levels
    const q = query.toLowerCase()
    return levels
      .map((level) => ({
        ...level,
        modules_level: level.modules_level.filter(
          (m) =>
            m.modules.code.toLowerCase().includes(q) ||
            m.modules.title.toLowerCase().includes(q)
        ),
      }))
      .filter((l) => l.modules_level.length > 0)
  }, [initialLevels, filter, query])

  const totalDiplomas = initialLevels.length
  const totalUnits = initialLevels.reduce((s, l) => s + l.modules_level.length, 0)

  return (
    <div className="flex flex-col w-full gap-5">
      {/* Hero */}
      <section className="relative w-full rounded-xl bg-surface-container-lowest p-6 md:p-10 shadow-sm overflow-hidden">
        <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 bottom-0 w-64 h-64 rounded-full bg-surface-container-high/60 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-1">
          <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant flex items-center gap-1">
            <BadgeCheck className="w-4 h-4" />
            Academic Programs &amp; Qualifications Framework
          </span>
          <h1 className="text-[32px] font-[700] leading-[40px] tracking-[-0.02em] text-on-surface mt-1">
            Course Modules &amp; Curriculum
          </h1>
          <p className="text-[16px] leading-[24px] text-on-surface-variant mt-2 max-w-2xl">
            Explore qualifications, core requirements, electives, and module
            specifications across all academic levels. Accreditations aligned
            with UK standard computing frameworks.
          </p>
        </div>
      </section>

      {/* Metrics + Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="grid gap-3 min-w-[280px] sm:min-w-[360px] grid-cols-2">
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">Qualifications</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[22px] font-[700] leading-[28px] text-on-surface">{totalDiplomas}</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">Diplomas</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-surface-container-low flex flex-col justify-between">
            <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">Modules</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[22px] font-[700] leading-[28px] text-on-surface">{totalUnits}</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">Units</span>
            </div>
          </div>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-[14px] leading-[20px] focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all placeholder:text-outline"
            placeholder="Search modules (e.g. NCC1000, Python, Databases)..."
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Requirement Legend */}
      <div className="flex flex-wrap items-center gap-2 text-[14px] font-[500] text-on-surface-variant">
        <span className="text-[12px] uppercase tracking-wider text-outline font-[600] mr-1">Types:</span>
        {(Object.entries(TYPE_META) as [TypeKey, typeof TYPE_META.core][]).map(([key, meta]) => (
          <span key={key} className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded", meta.pill)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = filter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              aria-pressed={isActive}
              className={cn(
                "px-4 py-2 rounded-lg text-[14px] font-[500] leading-[20px] whitespace-nowrap transition-all",
                isActive
                  ? "bg-primary-container text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Level Sections */}
      <div className="flex flex-col gap-6">
        {visibleLevels.map((level) => {
          const { number, title } = parseLevel(level.description)
          const num = number ?? "0"
          const label = LEVEL_LABELS[num] ?? `Level ${num}`
          const groups = groupByRequired(level)
          const totalModules = level.modules_level.length
          const breakdown = groups
            .map((g) => `${g.units.length} ${g.label}${g.units.length === 1 ? "" : "s"}`)
            .join(" • ")

          return (
            <section key={level.id} className="diploma-section space-y-4">
              {/* Section Header Card */}
              <div className="p-6 rounded-xl bg-surface-container-lowest shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px] bg-primary-fixed text-on-primary-fixed">
                      {label}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px] bg-surface-container text-on-surface-variant">
                      RQF Level {num}
                    </span>
                  </div>
                  <h2 className="text-[22px] font-[600] leading-[28px] text-on-surface tracking-tight">
                    {title}
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

              {/* Module Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {level.modules_level.map((entry) => {
                  const meta = TYPE_META[entry.required as TypeKey] ?? TYPE_META.elective
                  return (
                    <article
                      key={entry.modules.id}
                      className="group p-4 rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[12px] font-[500] tracking-wide text-secondary bg-surface-container-low px-2 py-0.5 rounded">
                            {entry.modules.code}
                          </span>
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[12px] font-[500] leading-[16px]", meta.pill)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                            {meta.label}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-[18px] font-[600] leading-[24px] text-on-surface group-hover:text-primary transition-colors">
                            {entry.modules.title}
                          </h3>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-high/30">
                        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">12 Credits</span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[14px] font-[500] leading-[20px] text-primary hover:text-secondary transition-colors"
                        >
                          <span>Syllabus</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {visibleLevels.length === 0 && (
        <div className="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <p className="text-[14px] leading-[20px] text-on-surface-variant">No modules match your filters.</p>
        </div>
      )}
    </div>
  )
}

function groupByRequired(level: Level) {
  const groups = new Map<string, { label: string; badge: string; units: { id: string; code: string; title: string }[] }>()
  const order: string[] = []
  for (const entry of level.modules_level) {
    const meta = TYPE_META[entry.required as TypeKey] ?? TYPE_META.elective
    const key = meta.label
    let group = groups.get(key)
    if (!group) {
      group = { label: meta.label, badge: meta.pill, units: [] }
      groups.set(key, group)
      order.push(key)
    }
    group.units.push({ id: entry.modules.id, code: entry.modules.code, title: entry.modules.title })
  }
  return order.map((key) => groups.get(key)!)
}