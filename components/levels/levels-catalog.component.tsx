"use client"

import { useState, useMemo } from "react"
import { Search, X, ArrowRight, ShieldCheck } from "lucide-react"

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
    pill: "bg-primary-container text-on-primary",
    dot: "bg-primary-fixed",
  },
  specialist: {
    label: "Specialist",
    pill: "bg-surface-container-lowest text-on-surface",
    dot: "bg-surface-dim",
  },
  elective: {
    label: "Elective",
    pill: "bg-surface-container-high text-on-surface-variant",
    dot: "bg-outline-variant",
  },
} as const

type TypeKey = keyof typeof TYPE_META

export default function LevelsCatalog({ initialLevels }: { initialLevels: Level[] }) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>("All")

  const levelOptions = useMemo(() => {
    const seen: string[] = []
    for (const level of initialLevels) {
      const { number } = parseLevel(level.description)
      const key = number ? `l${number}` : ""
      if (key && !seen.includes(key)) seen.push(key)
    }
    return seen
  }, [initialLevels])

  const tabs = useMemo(() => {
    const allCount = initialLevels.reduce((s, l) => s + l.modules_level.length, 0)
    const items: { label: string; key: string; count: number }[] = [
      { label: `All Programs (${allCount})`, key: "All", count: allCount },
    ]
    for (const key of levelOptions) {
      const num = key.replace("l", "")
      const level = initialLevels.find(
        (l) => parseLevel(l.description).number === num
      )
      const count = level ? level.modules_level.length : 0
      const { title } = parseLevel(level?.description ?? "")
      items.push({
        label: `Level ${num} ${title} (${count})`,
        key,
        count,
      })
    }
    return items
  }, [initialLevels, levelOptions])

  const filtered = useMemo(() => {
    const base = filter === "All" ? initialLevels : initialLevels.filter((l) => parseLevel(l.description).number === filter.replace("l", ""))
    if (!query.trim()) return base
    const q = query.toLowerCase()
    return base.map((level) => ({
      ...level,
      modules_level: level.modules_level.filter(
        (m) =>
          m.modules.code.toLowerCase().includes(q) ||
          m.modules.title.toLowerCase().includes(q)
      ),
    })).filter((l) => l.modules_level.length > 0)
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
            <ShieldCheck className="w-4 h-4" />
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
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
            >
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

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((level) =>
          level.modules_level.map((entry) => {
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
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 text-[14px] font-[500] leading-[20px] transition-colors",
                      "text-primary hover:text-secondary"
                    )}
                  >
                    <span>Syllabus</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            )
          })
        )}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <p className="text-[14px] leading-[20px] text-on-surface-variant">
            No modules match your filters.
          </p>
        </div>
      )}
    </div>
  )
}

function parseLevel(description: string) {
  const match = description.match(/\bLEVEL\s*(\d+)/i)
  const number = match?.[1] ?? null
  const title = description.replace(/\bLEVEL\s*\d+\s*/i, "").trim()
  return { number, title: title || description }
}