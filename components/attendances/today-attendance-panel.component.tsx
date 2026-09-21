'use client'
import { useEffect, useState } from "react"
import useTodayAttendanceData from "./use-today-attendance-data.hook"
import { TimetableCheckInButton } from "../teachers/timetable-check-in-button.component"
import { AttendanceStudentTable } from "./attendance-student-table.component"
import type { AttendanceUpdate } from "./attendance-student-table.component"
import { Spinner } from "../ui/spinner"


interface PanelProps {
  timetable_id: string
  batch_id: string
  module_id: string
  day_of_week: number
}

export default function TodayAttendancePanel({ timetable_id, batch_id, module_id, day_of_week }: PanelProps) {
  const { data, setData, loading, error, setAttendanceId, refetch } = useTodayAttendanceData(timetable_id)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const presentCount = data?.filter(item => item.status === "present").length

  async function handleSaveUpdates(updates: AttendanceUpdate[]) {
    setSaving(true)
    try {
      const res = await fetch("/api/attendances/bulk", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        throw new Error("Failed to update attendance")
      }
      setEditMode(false)
      refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {loading &&
        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center gap-2">
            <span>Loading today attendances</span>
            <Spinner />
          </div>
        </div>
      }
      {!loading && data === null &&
        <div className="flex gap-5">
          <span>Today class hasn't been checked in: </span>
          <TimetableCheckInButton
            sessionId={timetable_id}
            dayOfWeek={day_of_week}
            moduleId={module_id}
            batchId={batch_id}
            isFetchAllowed={true}
            setData={setData}
            setAttendanceId={setAttendanceId}
          />
        </div>
      }

      {!loading && data &&
        <div>
          <div
            className="flex justfiy-between m-5"
          >
            <span className="text-[13px] font-[600] leading-[18px] text-on-surface">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </span>
            <span className="ml-auto text-[11px] font-[500] leading-[14px] text-on-surface-variant shrink-0">
              {presentCount}/{data.length} present
            </span>
          </div>

          <AttendanceStudentTable
            students={data}
            editMode={editMode}
            saving={saving}
            onEnterEdit={() => setEditMode(true)}
            onCancel={() => setEditMode(false)}
            onSave={handleSaveUpdates}
          />
        </div>
      }
    </>
  )
}
