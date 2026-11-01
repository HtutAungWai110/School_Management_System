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
import type { BatchOption } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import {
  DAY_OF_WEEK_LABELS,
  DAY_OF_WEEK_OPTIONS,
  TIMETABLE_STATUS_OPTIONS,
} from "@/types/timetable.type"
import { SingleCombobox, type Option } from "./single-combobox.component"
import { ClassPicker, ScheduleConflicts } from "./class-picker.component"
import { useClassAvailability } from "./use-class-availability.hook"
import { useBatchModules, useBatchTeacherPairs } from "./use-batch-modules.hook"

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction >= 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -64 : 64, opacity: 0 }),
}

/** Monday, 9:00 – 12:00: the slot most sessions are created for, so the
 *  classroom step opens on something usable instead of empty comboboxes. */
const DEFAULT_DAY = "1"
const DEFAULT_START = "09:00"
const DEFAULT_END = "12:00"

interface TimetableFormValues {
  batch_id: string
  module_id: string
  teacher_id: string
  class_id: string
  day_of_week: string
  start_time: string
  end_time: string
  status: string
}

interface TimetableCreatePanelProps {
  batches: BatchOption[]
  classes: Class[]
  onClose: () => void
  fixedBatchId?: string
}

export function TimetableCreatePanel({
  batches,
  classes,
  onClose,
  fixedBatchId,
}: TimetableCreatePanelProps) {
  const pathname = usePathname()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState<boolean>(false)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<TimetableFormValues>({
    defaultValues: {
      status: "ongoing",
      day_of_week: DEFAULT_DAY,
      start_time: DEFAULT_START,
      end_time: DEFAULT_END,
      ...(fixedBatchId ? { batch_id: fixedBatchId } : {}),
    },
  })

  const watched = useWatch({ control })

  /* `useWatch` reports partial values; the comboboxes always hold a value, so
     these fallbacks keep the slot (and its availability request) well formed
     on the first render. */
  const dayOfWeek = watched.day_of_week ?? DEFAULT_DAY
  const startTime = watched.start_time ?? DEFAULT_START
  const endTime = watched.end_time ?? DEFAULT_END

  const timeSlots = timeSlotOptions(startTime, endTime)
  const selectedTimeSlot = timeSlotValue(startTime, endTime)

  const batchModules = useBatchModules(watched.batch_id)
  const batchTeacherPairs = useBatchTeacherPairs(watched.batch_id)

  const availability = useClassAvailability({
    dayOfWeek,
    startTime,
    endTime,
    teacherId: watched.teacher_id,
    batchId: watched.batch_id,
    /* Step 1 has no day or time to answer for yet, and the defaults would
       only be thrown away on the way to step 2. */
    enabled: step === 1,
  })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(dayOfWeek)]

  const selectedBatch = batches.find((batch) => batch.id === watched.batch_id) ?? null
  const selectedBatchModule = batchModules.find((module) => module.id === watched.module_id) ?? null

  const batchOptions: Option[] = batches.map((batch) => ({
    value: batch.id,
    label: batch.batch_name,
  }))

  const moduleOptions: Option[] = batchModules.map((module) => ({
    value: module.id,
    label: `${module.code} · ${module.title}`,
  }))

  const teacherOptions: Option[] = (() => {
    const relevantPairs = selectedBatchModule
      ? batchTeacherPairs.filter((pair) => pair.modules?.id === selectedBatchModule.id)
      : []
    const uniqueTeachers = new Map<string, Option>()
    for (const pair of relevantPairs) {
      if (pair.profiles && !uniqueTeachers.has(pair.profiles.id)) {
        uniqueTeachers.set(pair.profiles.id, {
          value: pair.profiles.id,
          label: pair.profiles.full_name,
        })
      }
    }
    return Array.from(uniqueTeachers.values())
  })()

  const statusOptions: Option[] = TIMETABLE_STATUS_OPTIONS

  const detailsComplete = !!(
    watched.batch_id &&
    watched.module_id &&
    watched.teacher_id &&
    watched.status
  )

  const teacherConflict = availability.data?.teacherConflict ?? null
  const batchConflict = availability.data?.batchConflict ?? null
  const slotBlocked = !!teacherConflict || !!batchConflict

  /* A room chosen for one slot may be taken in the next: the selection is
     dropped rather than carried into a request the server would reject. */
  const classSlots = availability.data?.classSlots ?? []
  const selectedRoomId = watched.class_id ?? ""
  const selectedRoomBusy = classSlots.some((slot) => slot.class_id === selectedRoomId)
  const chosenRoomId = selectedRoomBusy ? "" : selectedRoomId

  const slotComplete =
    !!chosenRoomId &&
    !availability.isLoading &&
    !!startTime &&
    !!endTime &&
    endTime > startTime &&
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
          status: data.status,
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

  const roomLabel = getClassroomLabel(chosenRoomId, classes)

  return (
    <>
      <ModulesPanelShell
        title="Create timetable"
        subtitle={
          step === 0 ? "Step 1 of 2 · Session details" : "Step 2 of 2 · Slot & classroom"
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
                      Pick a batch, module, teacher, and status to continue.
                    </p>
                  </div>

                  <div className="w-full">
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
                                disabled={!!fixedBatchId}
                                ariaInvalid={!!fieldState.error}
                              />
                              {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                              {fixedBatchId && (
                                <p className="text-xs text-on-surface-variant">Sessions are created for this batch.</p>
                              )}
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
                                emptyLabel={selectedBatch ? "No students in this batch have modules yet." : "Select a batch first."}
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
                                emptyLabel={selectedBatchModule ? "No teacher teaches this module." : "Select a module first."}
                                disabled={!selectedBatchModule}
                                ariaInvalid={!!fieldState.error}
                              />
                              {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                              {selectedBatchModule ? (
                                <p className="text-xs text-on-surface-variant">Only teachers who teach this module are shown.</p>
                              ) : (
                                <p className="text-xs text-on-surface-variant">Select a module to choose a teacher.</p>
                              )}
                            </>
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-on-surface" htmlFor="status">
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
                      Choose when the session runs, then pick a classroom that is free
                      at that time.
                    </p>
                  </div>

                  <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-on-surface" htmlFor="day">
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
                      <label className="text-sm font-medium text-on-surface" htmlFor="time-slot">
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
                      {startTime && endTime && (
                        <p className="text-xs text-on-surface-variant">
                          {dayLabel} · {formatTimeOfDay(startTime)} –{" "}
                          {formatTimeOfDay(endTime)}
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
                <Button type="button" disabled={isSubmitting || !slotComplete} onClick={() => setShowConfirm(true)}>
                  Create timetable
                </Button>
              </>
            )}
          </footer>
        </form>
      </ModulesPanelShell>

      <ConfirmDialog
        open={showConfirm}
        title="Create timetable?"
        description={
          selectedBatchModule && dayLabel
            ? `Schedule ${selectedBatchModule.title} in ${roomLabel} on ${dayLabel} from ${formatTimeOfDay(startTime)} to ${formatTimeOfDay(endTime)}?`
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
