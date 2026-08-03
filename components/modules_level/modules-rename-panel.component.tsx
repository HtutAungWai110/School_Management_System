"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useForm } from "react-hook-form"
import { Code2, Type } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils.util"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "./modules-panel-shell.component"
import type { Module } from "@/types/module.type"

interface RenameFormValues {
  code: string
  title: string
}

const inputErrorClass = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30"

interface ModulesRenamePanelProps {
  module: Module
  onClose: () => void
}

export function ModulesRenamePanel({ module, onClose }: ModulesRenamePanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RenameFormValues>({
    defaultValues: { code: module.code, title: module.title },
  })

  async function onSubmit(data: RenameFormValues) {
    setSubmitError(null)


    try {
      const res = await fetch(`/api/modules/${module.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.code, title: data.title }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSubmitError(data?.error ?? "Something went wrong while renaming the module.")
        return
      }



      await refetchData(pathname)
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  return (
    <ModulesPanelShell
      title="Rename module"
      subtitle={module.title}
      codeChip={module.code}
      onClose={onClose}
      className="max-w-[480px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Module details</p>
            <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
              Rename the module code and title.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface" htmlFor="module-code">
              Code
            </label>
            <div className="relative">
              <Code2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
              <Input
                id="module-code"
                className={cn("pl-9", inputErrorClass)}
                aria-invalid={!!errors.code}
                {...register("code", { required: "Code is required" })}
              />
            </div>
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface" htmlFor="module-title">
              Title
            </label>
            <div className="relative">
              <Type className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
              <Input
                id="module-title"
                className={cn("pl-9", inputErrorClass)}
                aria-invalid={!!errors.title}
                {...register("title", { required: "Title is required" })}
              />
            </div>
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
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
          <Button type="submit" disabled={isSubmitting}>
            Save changes
          </Button>
        </footer>
      </form>
    </ModulesPanelShell>
  )
}
