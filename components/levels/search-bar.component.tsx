import { Search, X } from "lucide-react"

export default function SearchBar({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (q: string) => void
}) {
  return (
    <div className="relative w-full md:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-9 text-[14px] text-foreground transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
        placeholder="Search modules by code or title"
        aria-label="Search modules by code or title"
      />
      {query && (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-on-surface-variant transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
