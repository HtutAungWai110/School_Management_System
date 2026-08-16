"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_OPTIONS, type ClassAvailabilitySlot } from "@/types/timetable.type"

type Option = { value: string; label: string }

type ClassAvailabilityState =
  | { classId: string; status: "ready"; slots: ClassAvailabilitySlot[] }
  | { classId: string; status: "error"; message: string }

function formatTime(time: string) {
  return time.slice(0, 5)
}

interface TimetableFormValues {
  batch_id: string
  module_id: string
  teacher_id: string
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
}

const inputErrorClass = "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/30"

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
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TimetableFormValues>()

  const watched = useWatch({ control })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watched.day_of_week)]

  const batchOptions: Option[] = batches.map((batch) => ({
    value: batch.id,
    label: batch.batch_name,
  }))

  const selectedBatch = batches.find((batch) => batch.id === watched.batch_id) ?? null
  const selectedModule = modules.find((module) => module.id === watched.module_id) ?? null
  const selectedClass = classes.find((classItem) => classItem.id === watched.class_id) ?? null

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

  const conflict =
    classAvailability?.find(
      (slot) =>
        slot.day_of_week === Number(watched.day_of_week) &&
        watched.start_time &&
        watched.end_time &&
        formatTime(watched.start_time) < formatTime(slot.end_time) &&
        formatTime(watched.end_time) > formatTime(slot.start_time)
    ) ?? null

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

      await refetchData(pathname)
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  return (
    <>
      <ModulesPanelShell
        title="Create timetable"
        subtitle="Schedule a class session"
        onClose={onClose}
        className="max-w-[560px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Session details
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Pick a batch, module, teacher, and class, then set the day and time.
              </p>
            </div>

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
                      {selectedClass && (
                        <div className="mt-2 space-y-1.5">
                          {availabilityLoading && (
                            <p className="text-xs text-on-surface-variant">Checking availability…</p>
                          )}
                          {availabilityError && <p className="text-xs text-destructive">{availabilityError}</p>}
                          {!availabilityLoading &&
                            !availabilityError &&
                            classAvailability &&
                            classAvailability.length > 0 && (
                              <div className="rounded-lg border border-outline-variant/10 bg-surface-container-low/40 px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                                  Occupied sessions
                                </p>
                                <ul className="mt-1 space-y-0.5">
                                  {classAvailability.map((slot) => (
                                    <li
                                      key={slot.id}
                                      className="text-[12px] leading-[16px] text-on-surface-variant"
                                    >
                                      {DAY_OF_WEEK_LABELS[slot.day_of_week]} · {formatTime(slot.start_time)} –{" "}
                                      {formatTime(slot.end_time)}
                                      {slot.modules ? ` · ${slot.modules.title}` : ""}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {!availabilityLoading &&
                            !availabilityError &&
                            classAvailability?.length === 0 && (
                              <p className="text-xs text-on-surface-variant">This class is free all week.</p>
                            )}
                          {conflict && (
                            <p className="text-[12px] leading-[16px] text-destructive">
                              Overlaps{" "}
                              {`${DAY_OF_WEEK_LABELS[conflict.day_of_week]} ${formatTime(conflict.start_time)} – ${formatTime(conflict.end_time)}`}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="day-of-week">
                  Day of week
                </label>
                <Controller
                  control={control}
                  name="day_of_week"
                  rules={{ required: "Choose a day" }}
                  render={({ field, fieldState }) => (
                    <>
                      <SingleCombobox
                        options={DAY_OF_WEEK_OPTIONS}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Choose a day"
                        emptyLabel="No day found."
                        ariaInvalid={!!fieldState.error}
                      />
                      {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                    </>
                  )}
                />
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="start-time">
                    Start time
                  </label>
                  <Input
                    id="start-time"
                    type="time"
                    className={cn(inputErrorClass)}
                    aria-invalid={!!errors.start_time}
                    {...register("start_time", { required: "Start time is required" })}
                  />
                  {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="end-time">
                    End time
                  </label>
                  <Input
                    id="end-time"
                    type="time"
                    className={cn(inputErrorClass)}
                    aria-invalid={!!errors.end_time}
                    {...register("end_time", { required: "End time is required" })}
                  />
                  {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
                </div>
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
            <Button type="button" disabled={isSubmitting || !!conflict} onClick={() => setShowConfirm(true)}>
              Create timetable
            </Button>
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Create timetable?"
        description={
          selectedModule
            ? `Schedule ${selectedModule.title} on ${dayLabel ?? "that day"}${
                watched.start_time ? ` from ${watched.start_time}` : ""
              }${watched.end_time ? ` to ${watched.end_time}` : ""}?`
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
