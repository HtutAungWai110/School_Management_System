"use client"

import { useEffect } from "react"
import { Check, X } from "lucide-react"

import { Button } from "@/components/ui/button.component"
import { cn } from "@/lib/utils.util"

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  isSubmitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  isSubmitting = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel()
    }

    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0 h-full w-full cursor-default bg-black/40 animate-in fade-in duration-300 motion-reduce:animate-none"
      />
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none">
        <div className="px-6 pb-6 pt-6">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-full",
              variant === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary-fixed/40 text-on-primary-fixed-variant"
            )}
          >
            {variant === "destructive" ? <X className="size-5" /> : <Check className="size-5" />}
          </div>
          <h2 className="mt-4 text-[18px] font-[800] leading-[26px] text-on-surface">{title}</h2>
          {description && (
            <p className="mt-1.5 text-[13px] leading-[19px] text-on-surface-variant">{description}</p>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button autoFocus type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </div>
  )
}
