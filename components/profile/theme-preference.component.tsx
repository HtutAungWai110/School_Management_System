"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import { ChevronDown } from "lucide-react"

const OPTIONS = [
  { value: "light", label: "Light mode" },
  { value: "dark", label: "Dark mode" },
  { value: "system", label: "System default" },
] as const

const emptySubscribe = () => () => {}

// next-themes reads localStorage, so the chosen value is unknown during
// SSR. Render the select with no selection until the client has mounted,
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
    <div className="flex flex-col gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-surface-container-low/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span className="block text-[14px] font-medium text-foreground">Theme</span>
        <p className="mt-0.5 text-[14px] text-on-surface-variant">
          Appearance. Saved on this device, not to your account.
        </p>
      </div>

      <div className="relative shrink-0 self-start sm:self-auto">
        <select
          value={mounted ? theme : ""}
          onChange={(e) => setTheme(e.target.value)}
          aria-label="Theme"
          className="appearance-none rounded-lg border border-border bg-surface-container-low py-2 pl-3 pr-9 text-[13px] font-medium text-foreground transition-colors hover:bg-surface-container-high focus:border-primary focus:outline-none"
        >
          {mounted ? null : <option value="">Theme</option>}
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
      </div>
    </div>
  )
}
