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
import type { Class } from "@/types/class.type"
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_OPTIONS, type ClassAvailabilitySlot } from "@/types/timetable.type"
import type { Timetable } from "@/types/timetable.type"

type Option = { value: string; label: string }

type ClassAvailabilityState =
  | { classId: string; status: "ready"; slots: ClassAvailabilitySlot[] }
  | { classId: string; status: "error"; message: string }

function formatTime(time: string) {
  return time.slice(0, 5)
}

interface TimetableEditFormValues {
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

interface TimetableEditPanelProps {
  timetable: Timetable
  classes: Class[]
  onClose: () => void
}

export function TimetableEditPanel({ timetable, classes, onClose }: TimetableEditPanelProps) {
  const pathname = usePathname()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [availabilityState, setAvailabilityState] = useState<ClassAvailabilityState | null>(null)

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TimetableEditFormValues>({
    defaultValues: {
      class_id: timetable.class_id,
      day_of_week: String(timetable.day_of_week),
      start_time: formatTime(timetable.start_time),
      end_time: formatTime(timetable.end_time),
    },
  })

  const watched = useWatch({ control })

  const watchedClassId = watched.class_id
  const watchedDay = watched.day_of_week
  const watchedStart = watched.start_time
  const watchedEnd = watched.end_time

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watchedDay)]

  const classOptions: Option[] = classes.map((classItem) => ({
    value: classItem.id,
    label: classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "Class"),
  }))

  useEffect(() => {
    if (!watchedClassId) return

    let cancelled = false

    fetch(`/api/timetables/class/${watchedClassId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load class availability.")
        return res.json() as Promise<ClassAvailabilitySlot[]>
      })
      .then((data) => {
        if (!cancelled) {
          setAvailabilityState({ classId: watchedClassId, status: "ready", slots: data ?? [] })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAvailabilityState({
            classId: watchedClassId,
            status: "error",
            message: err instanceof Error ? err.message : "Couldn't load class availability.",
          })
        }
      })

    return () => { cancelled = true }
  }, [watchedClassId])

  const classAvailability =
    availabilityState && availabilityState.classId === watchedClassId && availabilityState.status === "ready"
      ? availabilityState.slots
      : null
  const availabilityError =
    availabilityState && availabilityState.classId === watchedClassId && availabilityState.status === "error"
      ? availabilityState.message
      : null
  const availabilityLoading = !!watchedClassId && !classAvailability && !availabilityError

  const conflict =
    classAvailability?.find(
      (slot: ClassAvailabilitySlot) =>
        slot.id !== timetable.id &&
        slot.day_of_week === Number(watchedDay) &&
        watchedStart &&
        watchedEnd &&
        formatTime(watchedStart) < formatTime(slot.end_time) &&
        formatTime(watchedEnd) > formatTime(slot.start_time)
    ) ?? null

  async function onSubmit(data: TimetableEditFormValues) {
    setSubmitError(null)

    const payload: Record<string, unknown> = {}
    if (data.class_id !== timetable.class_id) payload.class_id = data.class_id
    if (Number(data.day_of_week) !== timetable.day_of_week) payload.day_of_week = Number(data.day_of_week)
    if (data.start_time !== formatTime(timetable.start_time)) payload.start_time = data.start_time
    if (data.end_time !== formatTime(timetable.end_time)) payload.end_time = data.end_time

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

  return (
    <>
      <ModulesPanelShell
        title="Edit session"
        subtitle={`${DAY_OF_WEEK_LABELS[timetable.day_of_week] ?? "Unknown"} · ${formatTime(timetable.start_time)} – ${formatTime(timetable.end_time)}`}
        onClose={onClose}
        className="max-w-[480px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6 max-h-100">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Session details
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                Update the class, day, or time for this session.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface">Batch</label>
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                  <span className="text-[14px] leading-[20px] text-on-surface">
                    {timetable.batches?.batch_name ?? "—"}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface">Module</label>
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                  <span className="text-[14px] leading-[20px] text-on-surface">
                    {timetable.modules ? (
                      <span>
                        <span className="font-bold">{timetable.modules.code}</span>
                        <span className="text-on-surface-variant"> · {timetable.modules.title}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
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
                    {watchedClassId && (
                      <div className="mt-2 space-y-1.5">
                        {availabilityLoading && (
                          <p className="text-xs text-on-surface-variant">Checking availability…</p>
                        )}
                        {availabilityError && <p className="text-xs text-destructive">{availabilityError}</p>}
                        {!availabilityLoading && !availabilityError && classAvailability && classAvailability.length > 0 && (
                          <div className="rounded-lg border border-outline-variant/10 bg-surface-container-low/40 px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                              Occupied sessions
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {classAvailability
                                .filter((slot: ClassAvailabilitySlot) => slot.id !== timetable.id)
                                .map((slot: ClassAvailabilitySlot) => (
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
                        {!availabilityLoading && !availabilityError && classAvailability && (
                          classAvailability.filter((s: ClassAvailabilitySlot) => s.id !== timetable.id).length === 0
                            ? <p className="text-xs text-on-surface-variant">This class has no other bookings.</p>
                            : null
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
              <label className="text-sm font-medium text-on-surface" htmlFor="edit-day">
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
                <label className="text-sm font-medium text-on-surface" htmlFor="edit-start-time">
                  Start time
                </label>
                <Input
                  id="edit-start-time"
                  type="time"
                  className={cn(inputErrorClass)}
                  aria-invalid={!!errors.start_time}
                  {...register("start_time", { required: "Start time is required" })}
                />
                {errors.start_time && <p className="text-xs text-destructive">{errors.start_time.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-on-surface" htmlFor="edit-end-time">
                  End time
                </label>
                <Input
                  id="edit-end-time"
                  type="time"
                  className={cn(inputErrorClass)}
                  aria-invalid={!!errors.end_time}
                  {...register("end_time", { required: "End time is required" })}
                />
                {errors.end_time && <p className="text-xs text-destructive">{errors.end_time.message}</p>}
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
