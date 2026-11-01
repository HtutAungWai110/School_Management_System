"use client"

import { useEffect, useState } from "react"

import type { TimetableWindowAvailability } from "@/types/timetable.type"

interface AvailabilityResult {
  url: string
  data: TimetableWindowAvailability | null
  error: string | null
}

const EMPTY_RESULT: AvailabilityResult = { url: "", data: null, error: null }

/**
 * Who occupies the rooms in one day/time window.
 *
 * The room is the last thing chosen, so this is keyed by the slot rather than
 * by a class: one request answers every classroom at once, and it re-runs when
 * the day, either time, the teacher or the batch changes.
 */
export function useClassAvailability({
  dayOfWeek,
  startTime,
  endTime,
  teacherId,
  batchId,
  excludeId,
  enabled = true,
}: {
  dayOfWeek: string
  startTime: string
  endTime: string
  teacherId?: string
  batchId?: string
  excludeId?: string
  enabled?: boolean
}) {
  const [result, setResult] = useState<AvailabilityResult>(EMPTY_RESULT)

  const valid =
    enabled && !!teacherId && !!batchId && !!startTime && !!endTime && endTime > startTime

  const params = new URLSearchParams()
  if (valid) {
    params.set("day_of_week", dayOfWeek)
    params.set("start_time", startTime)
    params.set("end_time", endTime)
    params.set("teacher_id", teacherId!)
    params.set("batch_id", batchId!)
    if (excludeId) params.set("exclude_id", excludeId)
  }

  const url = valid ? `/api/timetables/window-availability?${params}` : null

  useEffect(() => {
    if (url === null) return
    let cancelled = false

    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Couldn't load classroom availability.")
        return res.json() as Promise<TimetableWindowAvailability>
      })
      .then((data) => {
        if (!cancelled) setResult({ url, data, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            url,
            data: null,
            error: err instanceof Error ? err.message : "Couldn't load classroom availability.",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [url])

  const current = url !== null && result.url === url

  return {
    data: current ? result.data : null,
    error: current ? result.error : null,
    isLoading: url !== null && !current,
  }
}
