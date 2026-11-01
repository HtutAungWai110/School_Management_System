"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { AnimatePresence, motion } from "motion/react"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { getClassroomLabel } from "@/lib/utils.util"
import { formatTimeOfDay, timeSlotOptions, timeSlotValue } from "@/lib/timetable.util"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Class } from "@/types/class.type"
import {
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_OPTIONS,
  TIMETABLE_STATUS_OPTIONS,
} from "@/types/timetable.type"
import { SingleCombobox, type Option } from "../timetable/single-combobox.component"
import { ClassPicker, ScheduleConflicts } from "../timetable/class-picker.component"
import { useClassAvailability } from "../timetable/use-class-availability.hook"
import type { TimetableSession } from "./timetable-session-table.component"

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction >= 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -64 : 64, opacity: 0 }),
}

interface TimetableEditPanelProps {
  session: TimetableSession
  classes: Class[]
  onClose: () => void
}

interface TimetableEditFormValues {
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
  status: string
}

export function TimetableEditPanel({ session, classes, onClose }: TimetableEditPanelProps) {
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<TimetableEditFormValues>({
    defaultValues: {
      class_id: session.class_id,
      day_of_week: String(session.day_of_week),
      start_time: session.start_time.slice(0, 5),
      end_time: session.end_time.slice(0, 5),
      status: session.status ?? "ongoing",
    },
  })

  const watched = useWatch({ control })

  /* `useWatch` reports partial values; the comboboxes always hold one, so
     falling back to the session keeps the availability request well formed. */
  const watchedClassId = watched.class_id ?? session.class_id
  const watchedStart = watched.start_time ?? session.start_time.slice(0, 5)
  const watchedEnd = watched.end_time ?? session.end_time.slice(0, 5)
  const watchedDay = watched.day_of_week ?? String(session.day_of_week)

  const availability = useClassAvailability({
    dayOfWeek: watchedDay,
    startTime: watchedStart,
    endTime: watchedEnd,
    teacherId: session.teacher_id,
    batchId: session.batch_id,
    excludeId: session.id,
    enabled: step === 1,
  })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watchedDay)]

  const timeSlots = timeSlotOptions(watchedStart, watchedEnd)
  const selectedTimeSlot = timeSlotValue(watchedStart, watchedEnd)

  const statusOptions: Option[] = TIMETABLE_STATUS_OPTIONS

  const detailsComplete = !!watched.status

  const teacherConflict = availability.data?.teacherConflict ?? null
  const batchConflict = availability.data?.batchConflict ?? null
  const slotBlocked = !!teacherConflict || !!batchConflict

  /* A room chosen for one slot may be taken in the next: the selection is
     dropped rather than carried into a request the server would reject. */
  const classSlots = availability.data?.classSlots ?? []
  const selectedRoomBusy = classSlots.some((slot) => slot.class_id === watchedClassId)
  const chosenRoomId = selectedRoomBusy ? "" : watchedClassId

  const slotComplete =
    !!chosenRoomId &&
    !availability.isLoading &&
    !!watchedStart &&
    !!watchedEnd &&
    watchedEnd > watchedStart &&
    !slotBlocked

  function goNext() {
    setDirection(1)
    setStep(1)
  }

  function goBack() {
    setDirection(-1)
    setStep(0)
  }

  function changeTimeSlot(value: string) {
    const slot = timeSlots.find((option) => option.value === value)
    if (!slot) return

    setValue("start_time", slot.start, { shouldValidate: true })
    setValue("end_time", slot.end, { shouldValidate: true })
  }

  const hasChanges =
    watchedClassId !== session.class_id ||
    Number(watchedDay) !== session.day_of_week ||
    watchedStart !== session.start_time.slice(0, 5) ||
    watchedEnd !== session.end_time.slice(0, 5) ||
    watched.status !== (session.status ?? "ongoing")

  async function onSubmit(data: TimetableEditFormValues) {
    setSubmitError(null)

    const payload: Record<string, unknown> = {}
    if (data.class_id !== session.class_id) payload.class_id = data.class_id
    if (Number(data.day_of_week) !== session.day_of_week) payload.day_of_week = Number(data.day_of_week)
    if (data.start_time !== session.start_time.slice(0, 5)) payload.start_time = data.start_time
    if (data.end_time !== session.end_time.slice(0, 5)) payload.end_time = data.end_time
    const originalStatus = session.status ?? "ongoing"
    if (data.status !== originalStatus) payload.status = data.status

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    try {
      const res = await fetch(`/api/timetables/${session.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setSubmitError(body?.error ?? "Something went wrong while updating the session.")
        return
      }

      await refetchData([pathname, "/teacher/dashboard/overview", "/teacher/dashboard/timetable"])
      onClose()
    } catch {
      setSubmitError("Network error. Please try again.")
    }
  }

  const roomLabel = getClassroomLabel(chosenRoomId, classes)

  return (
    <>
      <ModulesPanelShell
        title="Edit session"
        subtitle={
          step === 0
            ? "Step 1 of 2 · Session details"
            : "Step 2 of 2 · Slot & classroom"
        }
        onClose={onClose}
        className="max-w-[680px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden px-6 py-6">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              {step === 0 ? (
                <motion.div
                  key="details"
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="flex-1 space-y-5"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Session details
                    </p>
                    <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                      Update the status, then choose when and where this session runs.
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-on-surface">Batch</label>
                        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                          <span className="text-[14px] leading-[20px] text-on-surface">
                            {session.batches?.batch_name ?? "—"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-on-surface">Module</label>
                        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                          <span className="text-[14px] leading-[20px] text-on-surface">
                            {session.modules?.code ? `${session.modules.code} · ${session.modules.title}` : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-on-surface">Teacher</label>
                        <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low/40 px-3 py-2">
                          <span className="text-[14px] leading-[20px] text-on-surface">
                            {session.profiles?.full_name ?? "—"}
                          </span>
                        </div>
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
                </motion.div>
              ) : (
                <motion.div
                  key="slot"
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                >
                  <div className="shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Slot & classroom
                    </p>
                    <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                      Move this session to a free slot, then pick an available classroom.
                      The current room is marked.
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface" htmlFor="edit-day">
                        Day
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

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface" htmlFor="edit-time-slot">
                        Time
                      </label>
                      <SingleCombobox
                        options={timeSlots}
                        value={selectedTimeSlot}
                        onValueChange={changeTimeSlot}
                        placeholder="Choose a time"
                        emptyLabel="No time found."
                      />
                      <p className="text-xs text-on-surface-variant">
                        Standard blocks: 9:00 AM – 12:00 PM, 1:00 PM – 4:00 PM.
                      </p>
                    </div>
                  </div>

                  <ScheduleConflicts teacher={teacherConflict} batch={batchConflict} />

                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <label className="text-sm font-medium text-on-surface">Classroom</label>
                      {watchedStart && watchedEnd && (
                        <p className="text-xs text-on-surface-variant">
                          {dayLabel} · {formatTimeOfDay(watchedStart)} –{" "}
                          {formatTimeOfDay(watchedEnd)}
                        </p>
                      )}
                    </div>

                    <ClassPicker
                      classes={classes}
                      slots={classSlots}
                      value={chosenRoomId}
                      onSelect={(classId) => setValue("class_id", classId, { shouldValidate: true })}
                      loading={availability.isLoading}
                      error={availability.error}
                      originalClassId={session.class_id}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {submitError && (
              <p className="shrink-0 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] leading-[18px] text-destructive">
                {submitError}
              </p>
            )}
          </div>

          <footer className="shrink-0 flex justify-end gap-3 border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
            {step === 0 ? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={!detailsComplete} onClick={goNext}>
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={goBack}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting || !hasChanges || !slotComplete}
                  onClick={() => setShowConfirm(true)}
                >
                  Save changes
                </Button>
              </>
            )}
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Update session?"
        description={
          dayLabel
            ? `Move this session to ${roomLabel} on ${dayLabel} from ${watchedStart} to ${watchedEnd}?`
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
