"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils.util"

interface ModulesPanelShellProps {
  title: string
  subtitle?: string
  codeChip?: string
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function ModulesPanelShell({
  title,
  subtitle,
  codeChip,
  onClose,
  children,
  className,
}: ModulesPanelShellProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
      />
      <div
        className={cn(
          "relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none",
          className
        )}
      >
        <header className="relative bg-primary-container px-6 pb-5 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">CodePoint Academy</p>
          <div className="mt-2 flex items-center justify-between gap-3 pr-10">
            <div className="min-w-0">
              <h2 className="truncate text-[20px] font-[800] leading-[28px] text-white">{title}</h2>
              {subtitle && <p className="mt-0.5 truncate text-[13px] leading-[18px] text-white/70">{subtitle}</p>}
            </div>
            {codeChip && (
              <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[12px] font-[700] leading-[16px] tracking-[0.08em] text-white">
                {codeChip}
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )
}
