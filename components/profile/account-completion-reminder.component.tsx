"use client"

import { useState } from "react"
import { CircleAlert, Settings, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useProfileStore } from "@/components/profile/profile.state"
import { cn } from "@/lib/utils.util"

const DISMISS_KEY = "account_completion_dismissed"

function isDismissed(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(DISMISS_KEY) === "true"
}

export function AccountCompletionReminder({ settingsHref }: { settingsHref: string }) {
  const { profile } = useProfileStore()
  const [dismissed, setDismissed] = useState(isDismissed)
  const [dontAskAgain, setDontAskAgain] = useState(false)

  const visible =
    !dismissed &&
    !!profile.id &&
    (!profile.date_of_birth || !profile.phone || !profile.address)

  function handleClose() {
    if (dontAskAgain) {
      localStorage.setItem(DISMISS_KEY, "true")
    }
    setDismissed(true)
  }

  if (!visible) return null

  return (
    <div className={cn("shrink-0 border-b border-secondary/30 bg-primary-fixed/10 px-4 py-3")}>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CircleAlert className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-[14px] font-[600] leading-[20px] text-on-surface">
              Complete your account
            </p>
            <p className="text-[12px] leading-[16px] text-on-surface-variant">
              Add your date of birth, phone, and address in settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] leading-[18px] text-on-surface-variant">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="size-4 accent-primary"
            />
            Don&apos;t ask me again
          </label>

          <Link href={settingsHref}>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </Link>

          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
