"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { BookOpen, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Teacher } from "@/types/teacher.type"
import type { Module } from "@/types/module.type"

type Option = { value: string; label: string }

interface ModuleRow {
  moduleId: string
}

interface TeacherModulesFormValues {
  modules: ModuleRow[]
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

interface TeacherModulesPanelProps {
  teacher: Teacher
  onClose: () => void
}

export function TeacherModulesPanel({ teacher, onClose }: TeacherModulesPanelProps) {
  const pathname = usePathname()
  const [modules, setModules] = useState<Module[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  const teacherModules = teacher.teacher_modules ?? []

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<TeacherModulesFormValues>({
    defaultValues: {
      modules: teacherModules.map((tm) => ({ moduleId: tm.modules?.id ?? "" })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "modules",
  })

  useEffect(() => {
    let cancelled = false

    fetch("/api/modules_level", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load modules")
        return res.json() as Promise<Module[]>
      })
      .then((data) => {
        if (!cancelled) setModules(data)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Something went wrong.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const moduleOptions: Option[] = (modules ?? []).map((module) => ({
    value: module.id,
    label: `${module.code} · ${module.title}`,
  }))

  const watchedModules = useWatch({ control, name: "modules" })
  const selectedModuleIds = new Set(
    (watchedModules ?? []).map((row) => row.moduleId).filter((id) => id !== "")
  )

  function addModule() {
    setSubmitError(null)
    append({ moduleId: "" })
  }

  async function onSubmit(data: TeacherModulesFormValues) {
    setSubmitError(null)

    const moduleIds = Array.from(
      new Set(
        data.modules
          .map((row) => row.moduleId)
          .filter((id) => id !== "")
      )
    )

    const payload = {
      modules: moduleIds,
    }




    try {
      const res = await fetch(`/api/teachers/${teacher.id}/modules`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while saving the modules.")
        return
      }


      const data = await res.json()
      console.log(data)
      await refetchData(pathname)
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Edit modules"
        subtitle={teacher.full_name}
        onClose={onClose}
        className="max-w-[560px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Modules & assignments
                </p>
                <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                  Set the modules this teacher is assigned to teach.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-[12px] font-[700] leading-[16px] text-on-surface-variant">
                {fields.length}
              </span>
            </div>

            {loadError ? (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {loadError}
              </p>
            ) : modules === null ? (
              <div className="space-y-2">
                {[1, 2].map((n) => (
                  <div key={n} className="animate-pulse rounded-xl border border-outline-variant/20 bg-surface-container-low/50 p-4" />
                ))}
              </div>
            ) : fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/50 px-6 py-8 text-center">
                <BookOpen className="mx-auto size-5 text-on-surface-variant/70" />
                <p className="mt-2 text-[13px] font-[600] text-on-surface">No modules assigned</p>
                <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                  Use the Add module button to assign one.
                </p>
              </div>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto">
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
                        <BookOpen className="size-4 text-on-surface-variant" />
                        Module
                      </div>
                      <button
                        type="button"
                        aria-label="Remove module"
                        onClick={() => remove(index)}
                        className="rounded-md p-1 text-on-surface-variant transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <Controller
                        control={control}
                        name={`modules.${index}.moduleId`}
                        rules={{ required: "Choose a module" }}
                        render={({ field: comboboxField, fieldState }) => {
                          const availableOptions = moduleOptions.filter(
                            (option) =>
                              option.value === comboboxField.value ||
                              !selectedModuleIds.has(option.value)
                          )
                          return (
                            <>
                              <SingleCombobox
                                options={availableOptions}
                                value={comboboxField.value}
                                onValueChange={comboboxField.onChange}
                                placeholder="Choose a module"
                                emptyLabel="No module found."
                                ariaInvalid={!!fieldState.error}
                              />
                              {fieldState.error && (
                                <p className="mt-1 text-xs text-destructive">{fieldState.error.message}</p>
                              )}
                            </>
                          )
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addModule}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant/60 px-4 py-2.5 text-[13px] font-[600] leading-[16px] text-primary transition-colors hover:border-primary/50 hover:bg-primary-fixed/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Plus className="size-4" />
              Add module
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
            <Button type="button" disabled={isSubmitting} onClick={() => setShowConfirm(true)}>
              Save changes
            </Button>
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Save changes?"
        description={`Update the assigned modules for ${teacher.full_name}?`}
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
