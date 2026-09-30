import { cn } from "@/lib/utils.util"

export default function FilterTabs({
  tabs,
  filter,
  onFilterChange,
}: {
  tabs: { label: string; key: string }[]
  filter: string
  onFilterChange: (key: string) => void
}) {
  return (
    <div role="tablist" aria-label="Filter by level" className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = filter === tab.key
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onFilterChange(tab.key)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-on-surface-variant hover:border-primary/40 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
