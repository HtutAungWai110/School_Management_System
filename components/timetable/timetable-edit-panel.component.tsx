"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Class } from "@/types/class.type"
import {
  DAY_OF_WEEK_LABELS,
  TIMETABLE_STATUS_OPTIONS,
  type Timetable,
} from "@/types/timetable.type"
import { SingleCombobox, type Option } from "./single-combobox.component"
import { TimeSlotGrid, type TimeSlot } from "./time-slot-grid.component"
import { useTimetableAvailability } from "./use-timetable-availability.hook"
import { useBatchModules } from "./use-batch-modules.hook"

interface TimetableEditPanelProps {
  timetable: Timetable
  classes: Class[]
  onClose: () => void
}

interface TimetableEditFormValues {
  module_id: string
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
  status: string
}

export function TimetableEditPanel({ timetable, classes, onClose }: TimetableEditPanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<TimetableEditFormValues>({
    defaultValues: {
      module_id: timetable.module_id,
      class_id: timetable.class_id,
      day_of_week: String(timetable.day_of_week),
      start_time: timetable.start_time.slice(0, 5),
      end_time: timetable.end_time.slice(0, 5),
      status: timetable.status ?? "ongoing",
    },
  })

  const watched = useWatch({ control })

  const watchedClassId = watched.class_id
  const watchedStart = watched.start_time
  const watchedEnd = watched.end_time

  const batchModules = useBatchModules(timetable.batch_id)

  const availability = useTimetableAvailability({
    classId: watchedClassId,
    teacherId: timetable.teacher_id,
    batchId: timetable.batch_id,
    excludeId: timetable.id,
  })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watched.day_of_week)]

  const classOptions: Option[] = classes.map((classItem) => ({
    value: classItem.id,
    label: classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "Class"),
  }))

  const moduleOptions: Option[] = batchModules.map((module) => ({
    value: module.id,
    label: `${module.code} · ${module.title}`,
  }))

  const statusOptions: Option[] = TIMETABLE_STATUS_OPTIONS

  function selectSlot(dayOfWeek: number, slot: TimeSlot) {
    setValue("day_of_week", String(dayOfWeek), { shouldValidate: true })
    setValue("start_time", slot.start, { shouldValidate: true })
    setValue("end_time", slot.end, { shouldValidate: true })
  }

  const isSelected = (dayOfWeek: number, startTime: string) =>
    Number(watched.day_of_week) === dayOfWeek && watched.start_time === startTime

  const hasChanges =
    watched.module_id !== timetable.module_id ||
    watchedClassId !== timetable.class_id ||
    Number(watched.day_of_week) !== timetable.day_of_week ||
    watched.start_time !== timetable.start_time.slice(0, 5) ||
    watched.end_time !== timetable.end_time.slice(0, 5) ||
    watched.status !== (timetable.status ?? "ongoing")

  async function onSubmit(data: TimetableEditFormValues) {
    setSubmitError(null)

    const payload: Record<string, unknown> = {}
    if (data.module_id !== timetable.module_id) payload.module_id = data.module_id
    if (data.class_id !== timetable.class_id) payload.class_id = data.class_id
    if (Number(data.day_of_week) !== timetable.day_of_week) payload.day_of_week = Number(data.day_of_week)
    if (data.start_time !== timetable.start_time.slice(0, 5)) payload.start_time = data.start_time
    if (data.end_time !== timetable.end_time.slice(0, 5)) payload.end_time = data.end_time
    const originalStatus = timetable.status ?? "ongoing"
    if (data.status !== originalStatus) payload.status = data.status

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    try {
      const res = await fetch(`/api/timetables/${timetable.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while updating the timetable.")
        return
      }

      await refetchData([pathname, `/admin/dashboard/batches/${timetable.batch_id}`])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  const showGrid =
    !!watchedClassId && !availability.isLoading && !availability.error

  return (
    <>
      <ModulesPanelShell
        title="Edit session"
        subtitle={`${DAY_OF_WEEK_LABELS[timetable.day_of_week] ?? "Unknown"} · ${timetable.start_time.slice(0, 5)} – ${timetable.end_time.slice(0, 5)}`}
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
                Update the class, day, or time for this session.
              </p>
            </div>

            <div className="w-2/3">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Batch</label>
                  <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                    <span className="text-[14px] leading-[20px] text-on-surface">
                      {timetable.batches?.batch_name ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="edit-module">
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
                          onValueChange={field.onChange}
                          placeholder="Choose a module"
                          emptyLabel="No modules in this batch."
                          ariaInvalid={!!fieldState.error}
                        />
                        {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                      </>
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Teacher</label>
                  <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                    <span className="text-[14px] leading-[20px] text-on-surface">
                      {timetable.profiles?.full_name ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="edit-class">
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
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface" htmlFor="edit-status">
                    Status
                  </label>
                  <Controller
                    control={control}
                    name="status"
                    rules={{ required: "Choose a status" }}
                    render={({ field, fieldState }) => (
                      <>
                        <SingleCombobox
                          options={statusOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Choose a status"
                          emptyLabel="No status found."
                          ariaInvalid={!!fieldState.error}
                        />
                        {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                      </>
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-on-surface">Day & Time</label>
                {!watchedClassId && (
                  <p className="text-xs text-on-surface-variant">Select a class first</p>
                )}
                {availability.isLoading && (
                  <p className="text-xs text-on-surface-variant">Loading availability…</p>
                )}
                {availability.error && (
                  <p className="text-xs text-destructive">{availability.error}</p>
                )}
              </div>

              {showGrid && (
                <TimeSlotGrid
                  getClassOccupant={availability.getClassOccupant}
                  getTeacherOccupant={availability.getTeacherOccupant}
                  getBatchOccupant={availability.getBatchOccupant}
                  isSelected={isSelected}
                  onSelectSlot={selectSlot}
                  originalDayOfWeek={timetable.day_of_week}
                  originalStartTime={timetable.start_time.slice(0, 5)}
                />
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
            <Button type="button" disabled={isSubmitting || !hasChanges} onClick={() => setShowConfirm(true)}>
              Save changes
            </Button>
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Update session?"
        description={
          dayLabel
            ? `Move this session to ${dayLabel}${
                watchedStart ? ` at ${watchedStart}` : ""
              }${watchedEnd ? ` – ${watchedEnd}` : ""}?`
            : undefined
        }
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
