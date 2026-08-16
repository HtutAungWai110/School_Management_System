"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import type { Batch } from "@/types/batch.type"
import type { Module } from "@/types/module.type"
import type { Teacher } from "@/types/teacher.type"
import type { Class } from "@/types/class.type"
import { TimetableCreatePanel } from "./timetable-create-panel.component"

interface TimetableCreateButtonProps {
  batches: Batch[]
  modules: Module[]
  teachers: Teacher[]
  classes: Class[]
}

export function TimetableCreateButton({ batches, modules, teachers, classes }: TimetableCreateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-on-primary px-6 py-2 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors duration-200 flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create Timetable
      </button>
      {open && (
        <TimetableCreatePanel
          batches={batches}
          modules={modules}
          teachers={teachers}
          classes={classes}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
