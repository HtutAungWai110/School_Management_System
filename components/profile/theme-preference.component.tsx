"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"

import { cn } from "@/lib/utils.util"

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun, note: "Always the light palette" },
  { value: "dark", label: "Dark", Icon: Moon, note: "Always the dark palette" },
  { value: "system", label: "System", Icon: Monitor, note: "Follow your device setting" },
] as const

const emptySubscribe = () => () => {}

// next-themes reads localStorage, so nothing is known during SSR. Render
// the shell without an active choice until the client has mounted,
// otherwise the markup would mismatch and React would discard it.
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export default function ThemePreference() {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  return (
    <div>
      <p className="text-[14px] font-medium text-foreground">Appearance</p>
      <p className="mt-0.5 text-[14px] text-on-surface-variant">
        Applies across your dashboard. Saved on this device, not to your account.
      </p>

      <div role="radiogroup" aria-label="Theme" className="mt-4 grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, Icon, note }) => {
          const selected = mounted && theme === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary-container"
                  : "border-border bg-card hover:border-primary/40 hover:bg-surface-container-low/50"
              )}
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-lg",
                  selected ? "bg-primary text-primary-foreground" : "bg-surface-container-high text-on-surface-variant"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className={cn("text-[14px] font-semibold", selected ? "text-on-primary-container" : "text-foreground")}>
                {label}
              </span>
              <span className={cn("text-[12px] leading-4", selected ? "text-on-primary-container/80" : "text-on-surface-variant")}>
                {note}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
