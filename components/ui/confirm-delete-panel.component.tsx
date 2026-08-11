"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import { cn } from "@/lib/utils.util"

interface ConfirmDeletePanelProps {
  title: string
  subtitle?: string
  codeChip?: string
  heading: string
  description: React.ReactNode
  confirmLabel: string
  onClose: () => void
  onConfirm: () => Promise<void>
  className?: string
}

export function ConfirmDeletePanel({
  title,
  subtitle,
  codeChip,
  heading,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  className,
}: ConfirmDeletePanelProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setSubmitError(null)
    setIsDeleting(true)

    try {
      await onConfirm()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Network error. Please try again.")
      setIsDeleting(false)
    }
  }

  return (
    <ModulesPanelShell
      title={title}
      subtitle={subtitle}
      codeChip={codeChip}
      onClose={onClose}
      className={cn("max-w-[480px]", className)}
    >
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3">
            <Trash2 className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-[14px] font-[600] leading-[20px] text-on-surface">{heading}</p>
              <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">{description}</p>
            </div>
          </div>

          {submitError && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
              {submitError}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </ModulesPanelShell>
  )
}
