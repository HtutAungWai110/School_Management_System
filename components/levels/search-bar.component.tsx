import { Search, X } from "lucide-react"

export default function SearchBar({ query, onQueryChange }: { query: string; onQueryChange: (q: string) => void }) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5 pointer-events-none" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="w-full pl-11 pr-10 py-2.5 rounded-lg bg-surface-container-low text-on-surface text-[14px] leading-[20px] focus:outline-none focus:bg-surface-container-lowest focus:shadow-md transition-all placeholder:text-outline"
        placeholder="Search modules (e.g. NCC1000, Python, Databases)..."
      />
      {query && (
        <button type="button" onClick={() => onQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
