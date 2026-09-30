"use client"

import { useState, useMemo } from "react"
import { BadgeCheck } from "lucide-react"

import type { Level } from "@/types/module.type"

import { normalizeTitle, parseLevel } from "./level-utils"
import SearchBar from "./search-bar.component"
import RequirementLegend from "./requirement-legend.component"
import FilterTabs from "./filter-tabs.component"
import LevelSection from "./level-section.component"

export default function LevelsCatalog({
  initialLevels,
  levelBriefs,
  moduleBriefs,
}: {
  initialLevels: Level[]
  levelBriefs: Record<string, string>
  moduleBriefs: Record<string, string>
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<string>("all")

  // Keyed by level id, not level number: two qualifications can share a
  // number ("Level 4 Diploma in Computing" and "... with Business
  // Management"), so a number-keyed tab silently hides one of them.
  const tabs = useMemo(() => {
    const allCount = initialLevels.reduce((s, l) => s + l.modules_level.length, 0)
    const items: { label: string; key: string }[] = [
      { label: `All programmes (${allCount})`, key: "all" },
      ...initialLevels.map((level) => {
        const { number, title } = parseLevel(level.description)
        const short = title.replace(/^diploma in /i, "").replace(/^advanced diploma in /i, "")
        return {
          label: `L${number ?? "?"} ${short} (${level.modules_level.length})`,
          key: level.id,
        }
      }),
    ]
    return items
  }, [initialLevels])

  const visibleLevels = useMemo(() => {
    const levels = filter === "all" ? initialLevels : initialLevels.filter((l) => l.id === filter)
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

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 md:p-10">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
            <BadgeCheck className="size-3.5" />
            Qualifications framework
          </span>
          <h1 className="mt-4 text-[32px] font-extrabold leading-[1.1] tracking-[-0.03em] text-foreground md:text-[40px]">
            Course modules
            <br />
            and curriculum
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-6 text-on-surface-variant">
            Every qualification in the catalogue, the modules it requires, and how many
            of each type you must take. Levels 3 to 5 stack — each one assumes the last.
          </p>
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar query={query} onQueryChange={setQuery} />
      </div>

      <div className="flex flex-col gap-3">
        <RequirementLegend />
        <FilterTabs tabs={tabs} filter={filter} onFilterChange={setFilter} />
      </div>

      <div className="flex flex-col gap-8">
        {visibleLevels.map((level) => {
          const { number } = parseLevel(level.description)
          const num = number ?? "0"
          return (
            <LevelSection
              key={level.id}
              level={level}
              levelLabel={num}
              brief={levelBriefs[normalizeTitle(level.description)]}
              moduleBriefs={moduleBriefs}
            />
          )
        })}
      </div>

      {visibleLevels.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-[15px] font-medium text-foreground">No modules match these filters</p>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Try a different module code or clear the search.
          </p>
        </div>
      )}
    </div>
  )
}