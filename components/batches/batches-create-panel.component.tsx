"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { Users } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxList,
  ComboboxItem,
  ComboboxValue,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils.util"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Level } from "@/types/module.type"

interface CreateBatchFormValues {
  batch_name: string
}

type LevelOption = { value: string; label: string }

const inputErrorClass = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30"

interface BatchesCreatePanelProps {
  levels: Level[]
  onClose: () => void
}

export function BatchesCreatePanel({ levels, onClose }: BatchesCreatePanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedLevels, setSelectedLevels] = useState<LevelOption[]>([])
  const [levelsError, setLevelsError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  const levelOptions: LevelOption[] = levels.map((level) => ({
    value: level.id,
    label: level.description,
  }))

  const availableLevelOptions = levelOptions.filter(
    (option) => !selectedLevels.some((selected) => selected.value === option.value)
  )

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateBatchFormValues>()

  const batchName = useWatch({ control, name: "batch_name" })

  async function onSubmit(data: CreateBatchFormValues) {
    setSubmitError(null)

    if (selectedLevels.length === 0) {
      setLevelsError("Select at least one level.")
      return
    }

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_name: data.batch_name,
          level_ids: selectedLevels.map((level) => level.value),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while creating the batch.")
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
        title="Create batch"
        subtitle="Add a new batch to the academy"
        onClose={onClose}
        className="max-w-[480px]"
      >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">Batch details</p>
            <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
              Give the batch a name and choose the levels it covers.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface" htmlFor="batch-name">
              Batch name
            </label>
            <div className="relative">
              <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
              <Input
                id="batch-name"
                className={cn("pl-9", inputErrorClass)}
                aria-invalid={!!errors.batch_name}
                placeholder="e.g. 2026 Intake A"
                {...register("batch_name", { required: "Batch name is required" })}
              />
            </div>
            {errors.batch_name && <p className="text-xs text-destructive">{errors.batch_name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-on-surface">Levels</span>
            <Combobox
              items={availableLevelOptions}
              multiple
              value={selectedLevels}
              onValueChange={(next) => {
                setSelectedLevels(next)
                setLevelsError(null)
              }}
            >
              <ComboboxChips
                className={cn(!!levelsError && "aria-invalid")}
                aria-invalid={!!levelsError}
              >
                <ComboboxValue>
                  {(value: LevelOption[]) => (
                    <>
                      {value.map((option) => (
                        <ComboboxChip key={option.value} aria-label={option.label}>
                          {option.label}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder={value.length > 0 ? "" : "Choose levels..."} />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent>
                <ComboboxEmpty>No levels found.</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {levelsError && <p className="text-xs text-destructive">{levelsError}</p>}
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
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              if (selectedLevels.length === 0) {
                setLevelsError("Select at least one level.")
                return
              }
              setLevelsError(null)
              setShowConfirm(true)
            }}
          >
            Create batch
          </Button>
        </footer>
      </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Create batch?"
        description={`Are you sure you want to create "${batchName}"?`}
        confirmLabel="Create"
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
