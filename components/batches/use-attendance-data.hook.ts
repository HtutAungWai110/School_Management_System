"use client"

import { useEffect, useState } from "react"
import type { AttendanceCalendarResponse } from "@/types/attendance.type"

export function useAttendanceData(batchId: string) {
  const [date, setDate] = useState<string | null>(null)
  const [data, setData] = useState<AttendanceCalendarResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loading = data === null && error === null

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (date) params.set("date", date)

    fetch(`/api/attendances/${batchId}?${params}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attendance data")
        return res.json() as Promise<AttendanceCalendarResponse>
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong")
        }
      })

    return () => {
      cancelled = true
    }
  }, [batchId, date])

  return { data, date, setDate, loading, error }
}
