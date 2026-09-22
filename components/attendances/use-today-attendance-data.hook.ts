import { useEffect, useState } from "react";
import type { AttendanceStudent } from "@/types/attendance.type";

export default function useTodayAttendanceData(timetableId: string) {
  const [data, setData] = useState<Array<AttendanceStudent> | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [attendanceId, setAttendanceId] = useState< string | null>(null)


  useEffect(() => {
    let cancelled = false
    const url = `/api/teacher/timetable/${timetableId}/today`

    fetch(url, { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (data && data.id) {
          setAttendanceId(data.id)
          const todayAttendanceUrl = `/api/attendances/single/${data.id}`
          fetch(todayAttendanceUrl, { credentials: "include" })
            .then(res => {
              if (!res.ok) throw new Error("Failed to get today attendance data")
              return res.json()
            })
            .then(data => {
              if (cancelled) return
              const attendances = Object.values(data.attendances)[0]
              setData(attendances as Array<AttendanceStudent>)
            })
            .catch(err => {
              if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong")
            })
            .finally(() => {
              if (!cancelled) setLoading(false)
            })
        } else {
          if (!cancelled) setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong")
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [timetableId])

  async function refetch() {
    if (!attendanceId) return;

    try {
      setLoading(true)
      const res = await fetch(`/api/attendances/single/${attendanceId}`, { credentials: "include" })
      if(!res.ok) throw new Error("Failed to refetch attedance data")
      const data = await res.json();
      const attendances = Object.values(data.attendances)[0]
      if(setData) setData(attendances as Array<AttendanceStudent>)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return {data, setData, loading, error, setAttendanceId, refetch}

}
