"use client"

import { useState, useMemo } from "react"
import { BadgeCheck } from "lucide-react"

import type { Level } from "@/types/module.type"

import { normalizeTitle, parseLevel } from "./level-utils"
import MetricBadges from "./metric-badges.component"
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
    const items: { label: string; key: string }[] = [
      { label: `All Programs (${allCount})`, key: "All" },
    ]
    for (const num of levelOptions) {
      const level = initialLevels.find((l) => parseLevel(l.description).number === num)
      const count = level ? level.modules_level.length : 0
      const { title } = parseLevel(level?.description ?? "")
      items.push({ label: `Level ${num} ${title} (${count})`, key: `l${num}` })
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

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <MetricBadges diplomas={totalDiplomas} units={totalUnits} />
        <SearchBar query={query} onQueryChange={setQuery} />
      </div>

      <RequirementLegend />
      <FilterTabs tabs={tabs} filter={filter} onFilterChange={setFilter} />

      <div className="flex flex-col gap-6">
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
        <div className="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm">
          <p className="text-[14px] leading-[20px] text-on-surface-variant">No modules match your filters.</p>
        </div>
      )}
    </div>
  )
}