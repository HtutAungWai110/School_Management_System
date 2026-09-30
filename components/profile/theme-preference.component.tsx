"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

interface ThemeOption {
  value: string
  label: string
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light mode" },
  { value: "dark", label: "Dark mode" },
  { value: "system", label: "System default" },
]

const emptySubscribe = () => () => {}

// next-themes reads localStorage, so the chosen value is unknown during
// SSR. Render the shell without a selection until the client has
// mounted, otherwise the markup would mismatch and React would discard it.
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
  const selected = OPTIONS.find((option) => option.value === theme) ?? null

  return (
    <div className="flex flex-col gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-surface-container-low/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <span className="block text-[14px] font-medium text-foreground">Theme</span>
        <p className="mt-0.5 text-[14px] text-on-surface-variant">
          Appearance. Saved on this device, not to your account.
        </p>
      </div>

      <div className="w-full shrink-0 self-start sm:w-[200px] sm:self-auto">
        <Combobox
          items={OPTIONS}
          value={selected}
          onValueChange={(next) => {
            if (next) setTheme(next.value)
          }}
        >
          <ComboboxInput
            className="w-full"
            placeholder={mounted ? "Theme" : ""}
            aria-label="Theme"
          />
          <ComboboxContent>
            <ComboboxEmpty>No match</ComboboxEmpty>
            <ComboboxList>
              {(option) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>
    </div>
  )
}
