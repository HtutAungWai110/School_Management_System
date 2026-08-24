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
import type { Batch } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import { DAY_OF_WEEK_LABELS, TIMETABLE_STATUS_OPTIONS } from "@/types/timetable.type"
import { SingleCombobox, type Option } from "./single-combobox.component"
import { TimeSlotGrid, type TimeSlot } from "./time-slot-grid.component"
import { useTimetableAvailability } from "./use-timetable-availability.hook"
import { useBatchModules, useBatchTeacherPairs } from "./use-batch-modules.hook"

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ x: direction >= 0 ? 64 : -64, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -64 : 64, opacity: 0 }),
}

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
  batches: Batch[]
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
      ...(fixedBatchId ? { batch_id: fixedBatchId } : {}),
    },
  })

  const watched = useWatch({ control })

  const batchModules = useBatchModules(watched.batch_id)
  const batchTeacherPairs = useBatchTeacherPairs(watched.batch_id)

  const availability = useTimetableAvailability({
    classId: watched.class_id,
    teacherId: watched.teacher_id,
    batchId: watched.batch_id,
  })

  const dayLabel = DAY_OF_WEEK_LABELS[Number(watched.day_of_week)]

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

  const classOptions: Option[] = classes.map((classItem) => ({
    value: classItem.id,
    label: classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "Class"),
  }))

  const statusOptions: Option[] = TIMETABLE_STATUS_OPTIONS

  const detailsComplete = !!(
    watched.batch_id &&
    watched.module_id &&
    watched.teacher_id &&
    watched.class_id &&
    watched.status
  )

  const hasSelection = !!(watched.day_of_week && watched.start_time && watched.end_time)

  const showGrid = !!watched.class_id && !availability.isLoading && !availability.error

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

  return (
    <>
      <ModulesPanelShell
        title="Create timetable"
        subtitle={step === 0 ? "Step 1 of 2 · Session details" : "Step 2 of 2 · Day & time"}
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
                      Pick a batch, module, teacher, and class to continue.
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
                  key="schedule"
                  custom={direction}
                  variants={SLIDE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  className="flex-1 space-y-5 "
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Day & time
                    </p>
                    <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                      Choose a free slot for this session.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-on-surface">Day & Time</label>
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
                <Button type="button" disabled={isSubmitting || !hasSelection} onClick={() => setShowConfirm(true)}>
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
            ? `Schedule ${selectedBatchModule.title} on ${dayLabel} from ${watched.start_time} to ${watched.end_time}?`
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
