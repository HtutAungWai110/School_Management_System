"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import type { Batch } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import { TimetableCreatePanel } from "./timetable-create-panel.component"

interface TimetableCreateButtonProps {
  batches: Batch[]
  classes: Class[]
  fixedBatch?: Batch | null
}

export function TimetableCreateButton({ batches, classes, fixedBatch }: TimetableCreateButtonProps) {
  const [open, setOpen] = useState(false)
  const activeBatches = fixedBatch ? [fixedBatch] : batches

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
          batches={activeBatches}
          classes={classes}
          fixedBatchId={fixedBatch?.id}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
