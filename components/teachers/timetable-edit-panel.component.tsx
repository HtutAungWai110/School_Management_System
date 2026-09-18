"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { AnimatePresence, motion } from "motion/react"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"
import { ModulesPanelShell } from "@/components/modules_level/modules-panel-shell.component"
import type { Class } from "@/types/class.type"
import {
  DAY_OF_WEEK_LABELS,
  TIMETABLE_STATUS_OPTIONS,
} from "@/types/timetable.type"
import { SingleCombobox, type Option } from "../timetable/single-combobox.component"
import { TimeSlotGrid, type TimeSlot } from "../timetable/time-slot-grid.component"
import { useTimetableAvailability } from "../timetable/use-timetable-availability.hook"
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

  const watchedClassId = watched.class_id
  const watchedStart = watched.start_time
  const watchedEnd = watched.end_time

  const availability = useTimetableAvailability({
    classId: watchedClassId,
    teacherId: session.teacher_id,
    batchId: session.batch_id,
    excludeId: session.id,
  })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watched.day_of_week)]

  const classOptions: Option[] = classes.map((classItem) => ({
    value: classItem.id,
    label: classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "Class"),
  }))

  const statusOptions: Option[] = TIMETABLE_STATUS_OPTIONS

  const detailsComplete = !!(watchedClassId && watched.status)

  function goNext() {
    setDirection(1)
    setStep(1)
  }

  function goBack() {
    setDirection(-1)
    setStep(0)
  }

  function selectSlot(dayOfWeek: number, slot: TimeSlot) {
    setValue("day_of_week", String(dayOfWeek), { shouldValidate: true })
    setValue("start_time", slot.start, { shouldValidate: true })
    setValue("end_time", slot.end, { shouldValidate: true })
  }

  const isSelected = (dayOfWeek: number, startTime: string) =>
    Number(watched.day_of_week) === dayOfWeek && watched.start_time === startTime

  const hasChanges =
    watchedClassId !== session.class_id ||
    Number(watched.day_of_week) !== session.day_of_week ||
    watched.start_time !== session.start_time.slice(0, 5) ||
    watched.end_time !== session.end_time.slice(0, 5) ||
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

  const showGrid =
    !!watchedClassId && !availability.isLoading && !availability.error

  return (
    <>
      <ModulesPanelShell
        title="Edit session"
        subtitle={
          step === 0
            ? "Step 1 of 2 · Session details"
            : `Step 2 of 2 · ${DAY_OF_WEEK_LABELS[session.day_of_week] ?? "Unknown"} · ${session.start_time.slice(0, 5)} – ${session.end_time.slice(0, 5)}`
        }
        onClose={onClose}
        className="max-w-[680px]"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
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
                      Update the class or status for this session.
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
                </motion.div>
              ) : (
                <motion.div
                  key="schedule"
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="flex-1 space-y-5 overflow-y-auto"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Day & time
                    </p>
                    <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                      Move this session to a free slot. The current slot is highlighted.
                    </p>
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
                        originalDayOfWeek={session.day_of_week}
                        originalStartTime={session.start_time.slice(0, 5)}
                      />
                    )}
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
                <Button type="button" disabled={isSubmitting || !hasChanges} onClick={() => setShowConfirm(true)}>
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
