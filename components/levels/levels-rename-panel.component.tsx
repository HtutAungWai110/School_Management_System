"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { Layers } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { cn } from "@/lib/utils.util"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Level } from "@/types/module.type"

interface RenameFormValues {
  description: string
}

const inputErrorClass = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30"

interface LevelsRenamePanelProps {
  level: Level
  onClose: () => void
}

export function LevelsRenamePanel({ level, onClose }: LevelsRenamePanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RenameFormValues>({
    defaultValues: { description: level.description },
  })

  async function onSubmit(data: RenameFormValues) {
    setSubmitError(null)

    try {
      const res = await fetch(`/api/levels/${level.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: data.description }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while renaming the level.")
        return
      }

      await refetchData(pathname)
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Rename level"
        subtitle={level.description}
        onClose={onClose}
        className="max-w-[480px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Level details</p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Rename the level description.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface" htmlFor="level-description">
                Description
              </label>
              <div className="relative">
                <Layers className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  id="level-description"
                  className={cn("pl-9", inputErrorClass)}
                  aria-invalid={!!errors.description}
                  {...register("description", { required: "Description is required" })}
                />
              </div>
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
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
            <Button type="button" disabled={isSubmitting} onClick={() => setShowConfirm(true)}>
              Save changes
            </Button>
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Save changes?"
        description={`Are you sure you want to rename "${level.description}"?`}
        confirmLabel="Save"
        isSubmitting={isSubmitting}
        onConfirm={() => {
          setShowConfirm(false)
          handleSubmit(onSubmit)()
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
