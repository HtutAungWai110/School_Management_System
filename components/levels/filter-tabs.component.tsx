import { cn } from "@/lib/utils.util"

export default function FilterTabs({ tabs, filter, onFilterChange }: {
  tabs: { label: string; key: string }[]
  filter: string
  onFilterChange: (key: string) => void
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = filter === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
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
  )
}
