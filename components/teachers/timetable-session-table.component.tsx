"use client"

import { useRef, useState, useEffect } from "react"
import { ArrowLeftRight, ChevronRight, MoreVertical, Pencil } from "lucide-react"
import Link from "next/link"
import type { Class } from "@/types/class.type"
import { TimetableEditPanel } from "./timetable-edit-panel.component"
import { TimetableSwapPanel } from "@/components/timetable/timetable-swap-panel.component"
import { TimetableCheckInButton } from "./timetable-check-in-button.component"
import { getClassroomLabel, getModuleColorWithOpacity, STATUS_CONFIG, type StatusKey } from "@/lib/utils.util"

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export interface TimetableSession {
  id: string
  batch_id: string
  module_id: string
  teacher_id: string
  class_id: string
  day_of_week: number
  start_time: string
  end_time: string
  status: string
  batches: {
    status: string
    batch_name: string
    count: number
  }
  modules: {
    code: string
    title: string
  }
  profiles: {
    full_name: string
  }
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":")
  const h = parseInt(hours, 10)
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${minutes} ${period}`
}

interface TimetableSessionTableProps {
  title: string
  subtitle: string
  sessions: TimetableSession[]
  showDay?: boolean
  classes?: Class[]
  embedded?: boolean
}

function SessionRow({
    session,
    showDay,
    classes,
  }: {
    session: TimetableSession
    showDay: boolean
    classes?: Class[]
  }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [swapOpen, setSwapOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (!menuOpen) return
      function handleClickOutside(event: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          setMenuOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [menuOpen])

    const moduleColor = getModuleColorWithOpacity(session.module_id, 0.3)
    const statusCfg = STATUS_CONFIG[session.status as StatusKey]

    return (
      <>
        <tr className="border-b border-primary/10 hover:bg-surface-container-low transition-colors">
          <td className="px-6 py-4">
            {/* One link covering the code and the title, rather than two
                adjacent links to the same session. The chevron is the same
                affordance the batch lists use. */}
            <Link
              href={`/teacher/dashboard/timetable/${session.id}`}
              /* A definite width, not a max-width: this table is auto-layout, so
                 without one the Module column is sized by its longest title and
                 squeezes Batch/Students/Classroom out of the row. The code is
                 clipped on one line; the title wraps to a second. */
              className="group inline-flex w-[190px] max-w-full items-center gap-1.5 sm:w-[260px]"
            >
              <span className="min-w-0 flex-1">
                <span
                  className="block w-fit max-w-full truncate rounded px-2 py-0.5 text-[14px] font-[300] leading-[20px]"
                  style={{ backgroundColor: moduleColor}}
                >
                  {session.modules.code}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-[16px] text-on-surface-variant transition-colors group-hover:text-primary">
                  {session.modules.title}
                </span>
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-primary/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
              />
            </Link>
          </td>
          <td className="px-6 py-4">
            <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{session.batches.batch_name}</span>
          </td>
          <td className="px-6 py-4">
            <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{session.batches.count}</span>
          </td>
          <td className="px-6 py-4">
            <span className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">
              {getClassroomLabel(session.class_id, classes)}
            </span>
          </td>
          {showDay && (
            <td className="px-6 py-4">
              <span className="text-[14px] font-[500] leading-[20px] text-on-surface">{dayNames[session.day_of_week - 1] ?? `Day ${session.day_of_week}`}</span>
            </td>
          )}
          <td className="px-6 py-4">
            <span className="text-[14px] font-[500] leading-[20px] text-on-surface-variant">
              {formatTime(session.start_time)} – {formatTime(session.end_time)}
            </span>
          </td>
          <td className="px-6 py-4">
            <div className="flex items-center gap-1.5">
              {statusCfg && (
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: statusCfg.color }}
                />
              )}
              <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                {session.status}
              </span>
            </div>
          </td>
          <td className="px-6 py-4">
            <div className="relative" ref={menuRef}>
              <button
                ref={triggerRef}
                type="button"
                aria-label="Actions"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg animate-in fade-in-0 zoom-in-95">
                  {session.status === "ongoing" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setSwapOpen(true)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[14px] leading-[20px] text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Swap schedule
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setEditOpen(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-[14px] leading-[20px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              )}
            </div>
            <TimetableCheckInButton
              sessionId={session.id}
              dayOfWeek={session.day_of_week}
              moduleId={session.module_id}
              batchId={session.batch_id}
            />
          </td>
        </tr>

        {swapOpen && (
          <TimetableSwapPanel
            session={session}
            classes={classes}
            refetchPaths={["/teacher/dashboard/overview", "/teacher/dashboard/timetable"]}
            onClose={() => {
              setSwapOpen(false)
              triggerRef.current?.focus()
            }}
          />
        )}

        {editOpen && (
          <TimetableEditPanel
            session={session}
            classes={classes ?? []}
            onClose={() => {
              setEditOpen(false)
              triggerRef.current?.focus()
            }}
          />
        )}
      </>
    )
  }

export function TimetableSessionTable({ title, subtitle, sessions, showDay = false, classes, embedded = false }: TimetableSessionTableProps) {
  const headers = showDay
    ? ["Module", "Batch", "Students", "Classroom", "Day", "Time", "Status", ""]
    : ["Module", "Batch", "Students", "Classroom", "Time", "Status", ""]

  const table = (
    <div className="overflow-x-auto min-h-40">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} showDay={showDay} classes={classes} />
          ))}
        </tbody>
      </table>
    </div>
  )

  if (embedded) {
    return table
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <div className="p-6 border-b border-outline-variant/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-[600] leading-[28px] text-primary">{title}</h2>
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{subtitle}</span>
      </div>
      {table}
    </div>
  )
}
