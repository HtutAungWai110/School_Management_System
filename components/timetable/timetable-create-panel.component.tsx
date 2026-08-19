"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"

import { MousePointerClick } from "lucide-react"
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
import { cn } from "@/lib/utils.util"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Batch } from "@/types/batch.type"
import type { Module } from "@/types/module.type"
import type { Teacher } from "@/types/teacher.type"
import type { Class } from "@/types/class.type"
import { DAY_OF_WEEK_LABELS, type ClassAvailabilitySlot } from "@/types/timetable.type"

type Option = { value: string; label: string }

type ClassAvailabilityState =
  | { classId: string; status: "ready"; slots: ClassAvailabilitySlot[] }
  | { classId: string; status: "error"; message: string }

interface TimetableFormValues {
  batch_id: string
  module_id: string
  teacher_id: string
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

const TIME_SLOTS = [
  { label: "9:00 AM – 12:00 PM", start: "09:00", end: "12:00" },
  { label: "1:00 PM – 4:00 PM", start: "13:00", end: "16:00" },
] as const

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const

function SingleCombobox({
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  ariaInvalid,
  disabled,
  className,
}: {
  options: Option[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  emptyLabel: string
  ariaInvalid?: boolean
  disabled?: boolean
  className?: string
}) {
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(next) => onValueChange(next?.value ?? "")}
    >
      <ComboboxInput
        className={className}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        disabled={disabled}
      />
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

interface TimetableCreatePanelProps {
  batches: Batch[]
  modules: Module[]
  teachers: Teacher[]
  classes: Class[]
  onClose: () => void
}

export function TimetableCreatePanel({
  batches,
  modules,
  teachers,
  classes,
  onClose,
}: TimetableCreatePanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [availabilityState, setAvailabilityState] = useState<ClassAvailabilityState | null>(null)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<TimetableFormValues>()

  const watched = useWatch({ control })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watched.day_of_week)]

  const batchOptions: Option[] = batches.map((batch) => ({
    value: batch.id,
    label: batch.batch_name,
  }))

  const selectedBatch = batches.find((batch) => batch.id === watched.batch_id) ?? null
  const selectedModule = modules.find((module) => module.id === watched.module_id) ?? null

  useEffect(() => {
    const classId = watched.class_id
    if (!classId) return

    let cancelled = false

    fetch(`/api/timetables/class/${classId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load class availability.")
        return res.json() as Promise<ClassAvailabilitySlot[]>
      })
      .then((data) => {
        if (!cancelled) {
          setAvailabilityState({ classId, status: "ready", slots: data ?? [] })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAvailabilityState({
            classId,
            status: "error",
            message: err instanceof Error ? err.message : "Couldn't load class availability.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [watched.class_id])

  const availabilityForClass =
    availabilityState?.classId === watched.class_id ? availabilityState : null
  const availabilityLoading = !!watched.class_id && !availabilityForClass
  const availabilityError =
    availabilityForClass?.status === "error" ? availabilityForClass.message : null
  const classAvailability =
    availabilityForClass?.status === "ready" ? availabilityForClass.slots : null

  const batchLevelIds = new Set(
    (selectedBatch?.batch_level ?? []).map((batchLevel) => batchLevel.level_id)
  )

  const moduleOptions: Option[] = modules
    .filter((module) =>
      (module.modules_level ?? []).some((moduleLevel) =>
        batchLevelIds.has(moduleLevel.levels.id)
      )
    )
    .map((module) => ({
      value: module.id,
      label: `${module.code} · ${module.title}`,
    }))

  const teacherOptions: Option[] = teachers
    .filter(
      (teacher) =>
        !selectedModule ||
        (teacher.teacher_modules ?? []).some(
          (teacherModule) => teacherModule.modules?.id === selectedModule.id
        )
    )
    .map((teacher) => ({
      value: teacher.id,
      label: teacher.full_name,
    }))

  const classOptions: Option[] = classes.map((classItem) => ({
    value: classItem.id,
    label: classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "Class"),
  }))

  function getSlotOccupant(dayOfWeek: number, startTime: string): ClassAvailabilitySlot | null {
    if (!classAvailability) return null
    return classAvailability.find(
      (slot) =>
        slot.day_of_week === dayOfWeek &&
        slot.start_time.slice(0, 5) === startTime
    ) ?? null
  }

  function selectSlot(dayOfWeek: number, slot: (typeof TIME_SLOTS)[number]) {
    setValue("day_of_week", String(dayOfWeek), { shouldValidate: true })
    setValue("start_time", slot.start, { shouldValidate: true })
    setValue("end_time", slot.end, { shouldValidate: true })
  }

  const isSelected = (dayOfWeek: number, startTime: string) =>
    Number(watched.day_of_week) === dayOfWeek &&
    watched.start_time === startTime

  async function onSubmit(data: TimetableFormValues) {
    setSubmitError(null)

    try {
      const res = await fetch("/api/timetables", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: data.batch_id,
          module_id: data.module_id,
          teacher_id: data.teacher_id,
          class_id: data.class_id,
          day_of_week: Number(data.day_of_week),
          start_time: data.start_time,
          end_time: data.end_time,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while creating the timetable.")
        return
      }

      await refetchData([pathname, `/admin/dashboard/batches/${data.batch_id}`])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  const hasSelection = watched.day_of_week && watched.start_time && watched.end_time

  return (
    <>
      <ModulesPanelShell
        title="Create timetable"
        subtitle="Schedule a class session"
        onClose={onClose}
        className="max-w-[680px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Session details
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Pick a batch, module, teacher, and class, then choose a day and time slot below.
              </p>
            </div>

            <div className="w-2/3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="batch">
                  Batch
                </label>
                <Controller
                  control={control}
                  name="batch_id"
                  rules={{ required: "Choose a batch" }}
                  render={({ field, fieldState }) => (
                    <>
                      <SingleCombobox
                        options={batchOptions}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setValue("module_id", "")
                          setValue("teacher_id", "")
                        }}
                        placeholder="Choose a batch"
                        emptyLabel="No batch found."
                        ariaInvalid={!!fieldState.error}
                      />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="module">
                  Module
                </label>
                <Controller
                  control={control}
                  name="module_id"
                  rules={{ required: "Choose a module" }}
                  render={({ field, fieldState }) => (
                    <>
                      <SingleCombobox
                        options={moduleOptions}
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          setValue("teacher_id", "")
                        }}
                        placeholder="Choose a module"
                        emptyLabel={selectedBatch ? "No modules cover this batch." : "Select a batch first."}
                        disabled={!selectedBatch}
                        ariaInvalid={!!fieldState.error}
                      />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                      {!selectedBatch && (
                        <p className="text-xs text-on-surface-variant">Select a batch to choose a module.</p>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="teacher">
                  Teacher
                </label>
                <Controller
                  control={control}
                  name="teacher_id"
                  rules={{ required: "Choose a teacher" }}
                  render={({ field, fieldState }) => (
                    <>
                      <SingleCombobox
                        options={teacherOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Choose a teacher"
                        emptyLabel={selectedModule ? "No teacher teaches this module." : "Select a module first."}
                        disabled={!selectedModule}
                        ariaInvalid={!!fieldState.error}
                      />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                      {selectedModule ? (
                        <p className="text-xs text-on-surface-variant">Only teachers who teach this module are shown.</p>
                      ) : (
                        <p className="text-xs text-on-surface-variant">Select a module to choose a teacher.</p>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="class">
                  Class
                </label>
                <Controller
                  control={control}
                  name="class_id"
                  rules={{ required: "Choose a class" }}
                  render={({ field, fieldState }) => (
                    <>
                      <SingleCombobox
                        options={classOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Choose a class"
                        emptyLabel="No class found."
                        ariaInvalid={!!fieldState.error}
                      />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </>
                  )}
                />
              </div>
              </div>
            </div>

            <div className="space-y-2 ">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-on-surface">Day & Time</label>
                {!watched.class_id && (
                  <p className="text-xs text-on-surface-variant">Select a class first</p>
                )}
                {watched.class_id && availabilityLoading && (
                  <p className="text-xs text-on-surface-variant">Loading availability…</p>
                )}
                {watched.class_id && availabilityError && (
                  <p className="text-xs text-destructive">{availabilityError}</p>
                )}
              </div>

              {watched.class_id && !availabilityLoading && !availabilityError && (
                <div className="max-h-[150px] overflow-y-auto rounded-xl border border-outline-variant/15">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low">
                      <tr>
                        <th className="px-3 py-2.5 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider w-[110px]" />
                        {TIME_SLOTS.map((slot) => (
                          <th
                            key={slot.start}
                            className="px-3 py-2.5 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider text-center"
                          >
                            {slot.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {DAYS.map((day) => (
                        <tr key={day} className="divide-x divide-outline-variant/10">
                          <td className="px-3 py-2 text-[13px] font-[600] leading-[18px] text-on-surface whitespace-nowrap">
                            {DAY_OF_WEEK_LABELS[day]}
                          </td>
                          {TIME_SLOTS.map((slot) => {
                            const occupant = getSlotOccupant(day, slot.start)
                            const selected = isSelected(day, slot.start)
                            const disabled = !!occupant

                            return (
                              <td key={slot.start} className="px-1.5 py-1.5">
                                <button
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => selectSlot(day, slot)}
                                  className={cn(
                                    "w-full rounded-lg px-2.5 py-2 text-left transition-colors",
                                    disabled
                                      ? "bg-destructive/5 border border-destructive/15 cursor-not-allowed"
                                      : selected
                                        ? "bg-primary/10 border-2 border-primary ring-1 ring-primary/20"
                                        : "bg-surface-container-low/50 border border-outline-variant/10 hover:bg-surface-container-low hover:border-outline-variant/25 cursor-pointer"
                                  )}
                                >
                                  {disabled && occupant ? (
                                    <div className="space-y-0.5">
                                      <p className="text-[11px] font-[600] leading-[14px] text-destructive truncate">
                                        {occupant.modules ? `${occupant.modules.code}` : "Booked"}
                                      </p>
                                      <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
                                        {occupant.modules?.title}
                                      </p>
                                      <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
                                        {occupant.batches?.batch_name}
                                      </p>
                                      <p className="text-[10px] leading-[13px] text-on-surface-variant truncate">
                                        {occupant.profiles?.full_name}
                                      </p>
                                    </div>
                                  ) : (
                                    <div className={cn(
                                      "flex items-center justify-center gap-1.5",
                                      selected ? "text-primary" : "text-on-surface-variant"
                                    )}>
                                      {!selected && <MousePointerClick className="w-3.5 h-3.5 shrink-0" />}
                                      <p className="text-[12px] font-[500] leading-[16px]">
                                        {selected ? "Selected" : "Available"}
                                      </p>
                                    </div>
                                  )}
                                </button>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {submitError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {submitError}
              </p>
            )}
          </div>

          <footer className="shrink-0 flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting || !hasSelection} onClick={() => setShowConfirm(true)}>
              Create timetable
            </Button>
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Create timetable?"
        description={
          selectedModule && dayLabel
            ? `Schedule ${selectedModule.title} on ${dayLabel} from ${watched.start_time} to ${watched.end_time}?`
            : undefined
        }
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
