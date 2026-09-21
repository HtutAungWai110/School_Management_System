"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "../ui/spinner"
import type { AttendanceStudent } from "@/types/attendance.type"

function isToday(dayOfWeek: number): boolean {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay()
  return dayOfWeek === today
}

interface TimetableCheckInButtonProps {
  sessionId: string
  dayOfWeek: number
  moduleId: string
  batchId: string
  isFetchAllowed: boolean
  setData: ((attendances: Array<AttendanceStudent>) => void) | null
  setAttendanceId: ((attendance_id: string) => void) | null
}

export function TimetableCheckInButton({ sessionId, dayOfWeek, moduleId, batchId, isFetchAllowed = false,  setData = null, setAttendanceId = null}: TimetableCheckInButtonProps) {
  const [loading, setLoading] = useState(true)
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (!isToday(dayOfWeek)) return
    async function fetchAttendance() {
      setLoading(true)
      try {
        const res = await fetch(`/api/teacher/timetable/${sessionId}/today`)
        const data = await res.json()
        if (data && data.id) {
          setCheckedIn(true)
        }
      } catch (error) {
        console.error(error)
      }
      setLoading(false)
    }
    fetchAttendance()
  }, [sessionId, dayOfWeek])

  async function handleCheckIn() {
    if (checkedIn || checkingIn) return
    setCheckingIn(true)
    try {
      const res = await fetch("/api/attendances/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timetable_id: sessionId,
          module_id: moduleId,
          batch_id: batchId,
          date: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      if (isFetchAllowed) {
        const { attendance_id } = data
        if(setAttendanceId) setAttendanceId(attendance_id)
        const attendancesRes = await fetch(`/api/attendances/single/${attendance_id}`, {credentials: "include"})
        const attendancesData = await attendancesRes.json();
        const attendances = Object.values(attendancesData.attendances)[0]
        if(setData) setData(attendances as Array<AttendanceStudent>)

      }
      setCheckedIn(true)
    } catch (error) {
      console.error(error)
    } finally {
      setCheckingIn(false)
    }


  }

  if (!isToday(dayOfWeek)) {
    return null
  }

  return (

    <>

      {loading ?
        (
          <div className="flex gap-2 items-center justify-center max-w-30 border border-primary/20 rounded-xl p-1">
          <span>Loading</span>
          <Spinner/>
        </div>
        ) :
        (
          <Button
            variant="default"
            size="sm"
            className="max-w-30"
            onClick={handleCheckIn}
            disabled={checkedIn || checkingIn || loading}

          >
            {checkedIn ? "Checked in" : checkingIn ? "Checking in..." : "Check in"}
            </Button>
        )
      }

    </>
  )
}
