"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { Layers, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "./modules-panel-shell.component"
import type { Level, Module } from "@/types/module.type"

type Option = { value: string; label: string }

interface LevelFormRow {
  levelId: string
  required: string
}

interface LevelsFormValues {
  levels: LevelFormRow[]
}

const REQUIRED_OPTIONS: Option[] = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  { value: "mandatory", label: "Mandatory" },
  { value: "specialist", label: "Specialist" },
]

function toDefaultValues(module: Module): LevelsFormValues {
  return {
    levels: module.modules_level.map((ml) => ({
      levelId: ml.levels.id,
      required: ml.required,
    })),
  }
}

function SingleCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  ariaInvalid,
  className,
}: {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  emptyLabel: string
  ariaInvalid?: boolean
  className?: string
}) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
    >
      <ComboboxInput className={className} placeholder={placeholder} aria-invalid={ariaInvalid} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

interface ModulesLevelsPanelProps {
  module: Module
  levels: Level[]
  onClose: () => void
}

export function ModulesLevelsPanel({ module, levels, onClose }: ModulesLevelsPanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LevelsFormValues>({
    defaultValues: toDefaultValues(module),
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "levels",
  })

  const levelOptions: Option[] = levels.map((level) => ({
    value: level.id,
    label: level.description,
  }))

  function addLevel() {
    setSubmitError(null)
    append({ levelId: "", required: "core" })
  }

  async function onSubmit(data: LevelsFormValues) {
    setSubmitError(null)

    const payload = {
      modules_level: data.levels
        .filter((row) => row.levelId !== "")
        .map((row) => ({ level_id: row.levelId, required: row.required })),
    }

    try {
      const res = await fetch(`/api/modules_level/${module.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSubmitError(data?.error ?? "Something went wrong while saving the levels.")
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
      title="Edit levels"
      subtitle={module.title}
      codeChip={module.code}
      onClose={onClose}
      className="max-w-[560px]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Levels & requirements
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Attach the levels this module covers and how each is required.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[12px] font-[700] leading-[16px] text-on-surface-variant">
              {fields.length}
            </span>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-outline-variant/50 px-6 py-8 text-center">
              <Layers className="mx-auto size-5 text-on-surface-variant/70" />
              <p className="mt-2 text-[13px] font-[600] text-on-surface">No levels added</p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Use the Add level button to attach a level and its requirement.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-xl border border-outline-variant/30 bg-surface-container-low/30 p-4 transition-colors focus-within:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[13px] font-[600] leading-[18px] text-on-surface">
                      <span className="flex size-6 items-center justify-center rounded-md bg-primary-fixed/40 text-[11px] font-[800] leading-none text-on-primary-fixed-variant">
                        {index + 1}
                      </span>
                      <Layers className="size-4 text-on-surface-variant" />
                      Level
                    </div>
                    <button
                      type="button"
                      aria-label="Remove level"
                      onClick={() => remove(index)}
                      className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface" htmlFor={`level-${field.id}`}>
                        Level
                      </label>
                      <Controller
                        control={control}
                        name={`levels.${index}.levelId`}
                        rules={{ required: "Choose a level" }}
                        render={({ field: comboboxField, fieldState }) => (
                          <>
                            <SingleCombobox
                              options={levelOptions}
                              value={comboboxField.value}
                              onValueChange={comboboxField.onChange}
                              placeholder="Choose a level"
                              emptyLabel="No level found."
                              ariaInvalid={!!fieldState.error}
                            />
                            {fieldState.error && (
                              <p className="text-xs text-destructive">{fieldState.error.message}</p>
                            )}
                          </>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface" htmlFor={`required-${field.id}`}>
                        Required
                      </label>
                      <Controller
                        control={control}
                        name={`levels.${index}.required`}
                        render={({ field: comboboxField }) => (
                          <SingleCombobox
                            options={REQUIRED_OPTIONS}
                            value={comboboxField.value}
                            onValueChange={comboboxField.onChange}
                            placeholder="Requirement"
                            emptyLabel="No requirement."
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addLevel}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/60 px-4 py-2.5 text-[13px] font-[600] leading-[16px] text-primary transition-colors hover:border-primary/50 hover:bg-primary-fixed/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="size-4" />
            Add level
          </button>

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
