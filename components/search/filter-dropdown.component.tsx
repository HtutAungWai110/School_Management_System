'use client'
import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Filter, Check } from "lucide-react"
import { cn } from "@/lib/utils.util"

interface FilterOption {
  label: string
  value: string
}

interface FilterButtonProps {
  options: FilterOption[]
  label?: string
}

export default function FilterButton({ options, label = "Filters" }: FilterButtonProps) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = searchParams.get("filter") ?? ""
  const activeLabel = options.find((option) => option.value === active)?.label ?? null

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  const applyFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set("filter", value)
    } else {
      params.delete("filter")
    }
    params.set("page", "1")
    router.push(`${path}?${params.toString()}`)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          active ? "text-primary" : "text-on-surface-variant hover:text-primary"
        )}
      >
        <Filter className="w-5 h-5" />
        {label}
        {activeLabel && (
          <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary border border-secondary-container text-[12px] font-[500] leading-[16px]">
            {activeLabel}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-9 z-10 min-w-[190px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1"
        >
          <button
            type="button"
            role="option"
            aria-selected={!active}
            onClick={() => applyFilter("")}
            className={cn(
              "w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] leading-[20px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
              !active ? "text-primary font-semibold" : "text-on-surface hover:bg-surface-container"
            )}
          >
            All
            {!active && <Check className="w-4 h-4" />}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={active === option.value}
              onClick={() => applyFilter(option.value)}
              className={cn(
                "w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[14px] leading-[20px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                active === option.value ? "text-primary font-semibold" : "text-on-surface hover:bg-surface-container"
              )}
            >
              {option.label}
              {active === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
