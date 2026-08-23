"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarClock, MoreVertical, Pencil, Trash2 } from "lucide-react"

import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type"
import type { Timetable } from "@/types/timetable.type"
import { cn } from "@/lib/utils.util"
import { TimetableEditPanel } from "./timetable-edit-panel.component"
import { TimetableDeletePanel } from "./timetable-delete-panel.component"
import { TimetableStatusBadge } from "./timetable-status-badge.component"
import type { Class } from "@/types/class.type"

function formatTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function classLabel(timetable: Timetable) {
  const classItem = timetable.classes
  if (!classItem) return "—"
  return classItem.class_number ? `Class ${classItem.class_number}` : (classItem.location ?? "—")
}

interface TimetableRowProps {
  timetable: Timetable
  classes: Class[]
}

export function TimetableRow({ timetable, classes }: TimetableRowProps) {
  const dayLabel = DAY_OF_WEEK_LABELS[timetable.day_of_week] ?? "Unknown"
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  return (
    <>
      <tr className="border-b border-primary/10 hover:bg-surface-container-low transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-on-primary-fixed-variant" />
            </div>
            <span className="text-[14px] leading-[20px] font-bold text-on-surface">{dayLabel}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
          {timetable.batches?.batch_name ?? "—"}
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
          {timetable.modules ? (
            <span>
              <span className="font-bold">{timetable.modules.code}</span>
              <span className="text-on-surface-variant"> · {timetable.modules.title}</span>
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">
          {timetable.profiles?.full_name ?? "—"}
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface">{classLabel(timetable)}</td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {formatTime(timetable.start_time)} – {formatTime(timetable.end_time)}
        </td>
        <td className="px-6 py-4">
          <TimetableStatusBadge status={timetable?.status ?? null} />
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              aria-label="Session actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-[150px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1">
                {[
                  {
                    label: "Edit",
                    icon: Pencil,
                    onClick: () => {
                      setMenuOpen(false)
                      setEditOpen(true)
                    },
                  },
                  {
                    label: "Delete",
                    icon: Trash2,
                    className: "text-destructive hover:bg-destructive/10",
                    iconClassName: "text-destructive",
                    onClick: () => {
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    },
                  },
                ].map(({ label, icon: Icon, className, iconClassName, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] hover:bg-surface-container transition-colors",
                      className ?? "text-on-surface"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", iconClassName ?? "text-on-surface-variant")} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
      {editOpen && (
        <TimetableEditPanel
          timetable={timetable}
          classes={classes}
          onClose={() => setEditOpen(false)}
        />
      )}
      {deleteOpen && (
        <TimetableDeletePanel
          timetable={timetable}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </>
  )
}
