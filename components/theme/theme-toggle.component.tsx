"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Check } from "lucide-react"
import { cn } from "@/lib/utils.util"

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

const emptySubscribe = () => () => {}

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex items-center gap-2 px-2 py-2 rounded-lg text-on-surface-variant transition-colors hover:text-primary hover:bg-surface-container"
        aria-label="Toggle theme"
      >
        <Sun className="w-5 h-5" />
      </button>
    )
  }

  const current = themes.find((t) => t.value === theme) ?? themes[2]
  const CurrentIcon = current.icon

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 px-2 py-2 rounded-lg text-on-surface-variant transition-colors hover:text-primary hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <CurrentIcon className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme"
          className="absolute bottom-10 left-0 z-10 min-w-[160px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1"
        >
          {themes.map((option) => {
            const OptionIcon = option.icon
            const selected = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setTheme(option.value)
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 text-left text-[14px] leading-[20px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary",
                  selected ? "text-primary font-semibold" : "text-on-surface hover:bg-surface-container"
                )}
              >
                <OptionIcon className="w-4 h-4" />
                {option.label}
                {selected && <Check className="w-4 h-4 ml-auto" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
