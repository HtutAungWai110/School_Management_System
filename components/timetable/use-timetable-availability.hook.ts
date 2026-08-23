"use client"

import { useEffect, useState } from "react"

import type {
  BatchAvailabilitySlot,
  ClassAvailabilitySlot,
  TeacherAvailabilitySlot,
} from "@/types/timetable.type"

type FetchState<T> =
  | { key: string; status: "ready"; data: T }
  | { key: string; status: "error"; message: string }

interface UseTimetableAvailabilityParams {
  classId?: string
  teacherId?: string
  batchId?: string
  excludeId?: string
}

function useAvailability<T>(
  key: string | undefined,
  pathPrefix: string,
  errorMessage: string
) {
  const [state, setState] = useState<FetchState<T[]> | null>(null)

  useEffect(() => {
    if (!key) return

    let cancelled = false

    fetch(`${pathPrefix}/${key}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(errorMessage)
        return res.json() as Promise<T[]>
      })
      .then((data) => {
        if (!cancelled) setState({ key, status: "ready", data: data ?? [] })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            key,
            status: "error",
            message: err instanceof Error ? err.message : errorMessage,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [key, pathPrefix, errorMessage])

  const current = state?.key === key ? state : null
  const loading = !!key && !current
  const error = current?.status === "error" ? current.message : null
  const slots = current?.status === "ready" ? current.data : null

  return { loading, error, slots }
}

function findOccupant<T extends { id: string; day_of_week: number; start_time: string }>(
  slots: T[] | null,
  excludeId: string | undefined,
  dayOfWeek: number,
  startTime: string
): T | null {
  if (!slots) return null
  return (
    slots.find(
      (slot) =>
        slot.id !== excludeId &&
        slot.day_of_week === dayOfWeek &&
        slot.start_time.slice(0, 5) === startTime
    ) ?? null
  )
}

export function useTimetableAvailability({
  classId,
  teacherId,
  batchId,
  excludeId,
}: UseTimetableAvailabilityParams) {
  const classAvailability = useAvailability<ClassAvailabilitySlot>(
    classId,
    "/api/timetables/class",
    "Couldn't load class availability."
  )

  const teacherAvailability = useAvailability<TeacherAvailabilitySlot>(
    teacherId,
    "/api/timetables/teacher",
    "Couldn't load teacher availability."
  )

  const batchAvailability = useAvailability<BatchAvailabilitySlot>(
    batchId,
    "/api/timetables/batch",
    "Couldn't load batch availability."
  )

  function getClassOccupant(dayOfWeek: number, startTime: string): ClassAvailabilitySlot | null {
    return findOccupant(classAvailability.slots, excludeId, dayOfWeek, startTime)
  }

  function getTeacherOccupant(dayOfWeek: number, startTime: string): TeacherAvailabilitySlot | null {
    return findOccupant(teacherAvailability.slots, excludeId, dayOfWeek, startTime)
  }

  function getBatchOccupant(dayOfWeek: number, startTime: string): BatchAvailabilitySlot | null {
    return findOccupant(batchAvailability.slots, excludeId, dayOfWeek, startTime)
  }

  return {
    isLoading:
      classAvailability.loading || teacherAvailability.loading || batchAvailability.loading,
    error:
      classAvailability.error || teacherAvailability.error || batchAvailability.error,
    getClassOccupant,
    getTeacherOccupant,
    getBatchOccupant,
  }
}
