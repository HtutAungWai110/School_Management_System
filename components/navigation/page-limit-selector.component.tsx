"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils.util"

const LIMIT_OPTIONS = [10, 20, 30, 40, 50]

interface PageLimitSelectorProps {
  className?: string
}

export function PageLimitSelector({ className }: PageLimitSelectorProps) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentLimit = searchParams.get("limit") ?? "10"

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", value)
    params.set("page", "1")
    router.push(`${path}?${params.toString()}`)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">Show</span>
      <select
        value={currentLimit}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-[12px] font-[500] leading-[16px] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
      >
        {LIMIT_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">per page</span>
    </div>
  )
}
