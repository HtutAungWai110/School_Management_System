"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import type { Level } from "@/types/module.type"
import { BatchesCreatePanel } from "./batches-create-panel.component"

interface BatchesCreateButtonProps {
  levels: Level[]
}

export function BatchesCreateButton({ levels }: BatchesCreateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-on-primary px-6 py-2 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors duration-200 flex items-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Create Batch
      </button>
      {open && <BatchesCreatePanel levels={levels} onClose={() => setOpen(false)} />}
    </>
  )
}
