"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { TimetableSession } from "./timetable-session-table.component"

function isToday(dayOfWeek: number): boolean {
  const today = new Date().getDay() === 0 ? 7 : new Date().getDay()
  return dayOfWeek === today
}

interface TimetableCheckInButtonProps {
  sessionId: string
  dayOfWeek: number
  moduleId: string
  batchId: string
}

export function TimetableCheckInButton({ sessionId, dayOfWeek, moduleId, batchId }: TimetableCheckInButtonProps) {
  const [checkedIn, setCheckedIn] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (!isToday(dayOfWeek)) return
    async function fetchAttendance() {
      try {
        const res = await fetch(`/api/teacher/timetable/${sessionId}/today`)
        const data = await res.json()
        if (data && data.id) {
          setCheckedIn(true)
        }
      } catch (error) {
        console.error(error)
      }
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
      console.log(data)
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
    <Button
      variant="default"
      size="sm"
      className="w-full"
      onClick={handleCheckIn}
      disabled={checkedIn || checkingIn}
    >
      {checkedIn ? "Checked in" : checkingIn ? "Checking in..." : "Check in"}
    </Button>
  )
}