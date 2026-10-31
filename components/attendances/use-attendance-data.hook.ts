"use client"

import { useCallback, useEffect, useState } from "react"
import type {
  AttendanceCalendarResponse,
  AttendanceCalendarSummaryResponse,
  AttendanceStudent,
  ModuleAttendanceStats,
  StudentModuleRate,
} from "@/types/attendance.type"

/** A fetched payload together with the URL it answers.
 *
 *  The URL is stored beside the data so a *different* request is recognised as
 *  still in flight by comparison, instead of clearing state from inside the
 *  effect — React's `set-state-in-effect` rule forbids that. A refetch of the
 *  same URL keeps the previous payload visible until the new one lands, so a
 *  save or a reload does not collapse the panel to a skeleton. */
type RequestState<T> = {
  url: string | null
  data: T | null
  error: string | null
}

function useRequest<T>(url: string | null) {
  const [state, setState] = useState<RequestState<T>>({
    url: null,
    data: null,
    error: null,
  })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (url === null) return
    let cancelled = false

    fetch(url, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attendance data")
        return res.json() as Promise<T>
      })
      .then((json) => {
        if (!cancelled) setState({ url, data: json, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            url,
            data: null,
            error: err instanceof Error ? err.message : "Something went wrong",
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [url, reloadKey])

  const settled = url !== null && state.url === url

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  return {
    data: settled ? state.data : null,
    error: settled ? state.error : null,
    loading: url !== null && !settled,
    reload,
  }
}

/** The scope query every report endpoint takes: one batch, or one session. */
function scopeParams(batchId?: string, timetableId?: string): URLSearchParams | null {
  const params = new URLSearchParams()
  if (batchId) params.set("batch_id", batchId)
  else if (timetableId) params.set("timetable_id", timetableId)
  else return null
  return params
}

/** The staff calendar: sessions plus per-date counts, no student identities. */
export function useAttendanceCalendar(batchId?: string, timetableId?: string) {
  const [date, setDate] = useState<string | null>(null)

  const params = new URLSearchParams()
  if (date) params.set("date", date)

  const url = timetableId
    ? `/api/teacher/timetable/${timetableId}/attendances?${params}`
    : batchId
      ? `/api/attendances/${batchId}?${params}`
      : null

  const { data, error, loading, reload } =
    useRequest<AttendanceCalendarSummaryResponse>(url)

  return { data, date, setDate, loading, error, refresh: reload }
}

/** The signed-in student's own month. Same shape as the staff calendar. */
export function useStudentAttendance(batchId?: string) {
  const [date, setDate] = useState<string | null>(null)

  const params = new URLSearchParams()
  if (batchId) params.set("batch_id", batchId)
  if (date) params.set("date", date)

  const { data, error, loading, reload } = useRequest<AttendanceCalendarResponse>(
    batchId ? `/api/student/attendance?${params}` : null
  )

  return { data, date, setDate, loading, error, refresh: reload }
}

/** Present/late/absent per module. Not fetched until the section is opened. */
export function useModuleSummary(
  batchId: string | undefined,
  timetableId: string | undefined,
  date: string | null,
  enabled: boolean
) {
  const params = scopeParams(batchId, timetableId)
  if (params && date) params.set("date", date)

  return useRequest<ModuleAttendanceStats[]>(
    enabled && params ? `/api/attendances/summary?${params}` : null
  )
}

/** Per-student rates per module. Not fetched until the section is opened. */
export function useStudentRates(
  batchId: string | undefined,
  timetableId: string | undefined,
  date: string | null,
  enabled: boolean
) {
  const params = scopeParams(batchId, timetableId)
  if (params && date) params.set("date", date)

  return useRequest<StudentModuleRate[]>(
    enabled && params ? `/api/attendances/rates?${params}` : null
  )
}

/** One date's roster, fetched only once its row is opened. */
export function useSessionRoster(
  timetableId: string,
  date: string,
  enabled: boolean
) {
  const params = new URLSearchParams({ timetable_id: timetableId, date })

  return useRequest<AttendanceStudent[]>(
    enabled ? `/api/attendances/session?${params}` : null
  )
}
