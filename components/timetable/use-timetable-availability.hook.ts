"use client"

import { useEffect, useState } from "react"

import type {
  BatchAvailabilitySlot,
  ClassAvailabilitySlot,
  TeacherAvailabilitySlot,
} from "@/types/timetable.type"

interface AvailabilityData {
  teacher: TeacherAvailabilitySlot[]
  class: ClassAvailabilitySlot[]
  batch: BatchAvailabilitySlot[]
}

interface UseTimetableAvailabilityParams {
  classId?: string
  teacherId?: string
  batchId?: string
  excludeId?: string
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

interface AvailabilityResult {
  key: string
  data: AvailabilityData | null
  error: string | null
}

const EMPTY_RESULT: AvailabilityResult = { key: "", data: null, error: null }

export function useTimetableAvailability({
  classId,
  teacherId,
  batchId,
  excludeId,
}: UseTimetableAvailabilityParams) {
  const [result, setResult] = useState<AvailabilityResult>(EMPTY_RESULT)

  const requestKey = classId && teacherId && batchId ? `${classId}|${teacherId}|${batchId}` : null

  useEffect(() => {
    if (!classId || !teacherId || !batchId) return

    const key = `${classId}|${teacherId}|${batchId}`
    let cancelled = false

    fetch("/api/timetables/check-session-availability", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batch_id: batchId,
        teacher_id: teacherId,
        class_id: classId,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load session availability.")
        return res.json() as Promise<AvailabilityData>
      })
      .then((data) => {
        if (!cancelled) {
          setResult({ key, data, error: null })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            key,
            data: null,
            error: err instanceof Error ? err.message : "Couldn't load session availability.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [classId, teacherId, batchId])

  const isCurrent = !!requestKey && result.key === requestKey
  const data = isCurrent ? result.data : null
  const error = isCurrent ? result.error : null
  const loading = !!requestKey && !isCurrent

  const teacherSlots = data?.teacher ?? null
  const classSlots = data?.class ?? null
  const batchSlots = data?.batch ?? null

  function getClassOccupant(dayOfWeek: number, startTime: string): ClassAvailabilitySlot | null {
    return findOccupant(classSlots, excludeId, dayOfWeek, startTime)
  }

  function getTeacherOccupant(dayOfWeek: number, startTime: string): TeacherAvailabilitySlot | null {
    return findOccupant(teacherSlots, excludeId, dayOfWeek, startTime)
  }

  function getBatchOccupant(dayOfWeek: number, startTime: string): BatchAvailabilitySlot | null {
    return findOccupant(batchSlots, excludeId, dayOfWeek, startTime)
  }

  return {
    isLoading: loading,
    error,
    getClassOccupant,
    getTeacherOccupant,
    getBatchOccupant,
  }
}
