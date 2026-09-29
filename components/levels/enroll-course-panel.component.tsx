"use client"

import { useState } from "react"
import { ChevronDown, Lock, Check, LockKeyhole } from "lucide-react"

import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey, type ModuleEntry, getLevelRule } from "./level-utils"

const GROUP_ORDER: TypeKey[] = ["core", "mandatory", "specialist", "elective"]
const LOCKED: TypeKey[] = ["core", "mandatory", "specialist"]

interface Props {
  level: { id: string; description: string; modules_level: ModuleEntry[] }
}

export default function EnrollCoursePanel({ level }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedElectives, setSelectedElectives] = useState<string[]>([])

  const rule = getLevelRule(level.description)
  const electiveLimit = rule.electiveLimit

  const groups = GROUP_ORDER.map((key) => ({
    key,
    units: level.modules_level.filter((m) => m.required === key),
  })).filter((g) => g.units.length > 0)

  const atLimit = selectedElectives.length >= electiveLimit
  const isComplete = selectedElectives.length === electiveLimit

  function toggleElective(id: string) {
    setSelectedElectives((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : prev.length < electiveLimit ? [...prev, id] : prev
    )
  }

  return (
    <div className="w-full md:w-[320px] self-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-[14px] font-[500] leading-[20px] hover:opacity-90 transition-opacity"
      >
        Enroll Course
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-surface-container-lowest shadow-sm border border-surface-container-high/30 overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-[600] leading-[20px] text-on-surface">Select Modules</h3>
              <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                {electiveLimit === 0
                  ? "No electives"
                  : `${selectedElectives.length} / ${electiveLimit} elective${electiveLimit === 1 ? "" : "s"}`}
              </span>
            </div>

            {groups.map((group) => {
              const meta = TYPE_META[group.key]
              const isLocked = LOCKED.includes(group.key)
              return (
                <div key={group.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] font-[500] leading-[16px]", meta.pill)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                      {meta.label}
                    </span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-[500] leading-[14px] text-outline">
                        <Lock className="w-3 h-3" />
                        Required
                      </span>
                    )}
                  </div>

                  {group.units.map((entry) => {
                    const unit = entry.modules
                    const checked = isLocked || selectedElectives.includes(unit.id)
                    const disabled = isLocked || (group.key === "elective" && !checked && atLimit)
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => group.key === "elective" && toggleElective(unit.id)}
                        aria-pressed={checked}
                        className={cn(
                          "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors",
                          disabled ? "cursor-not-allowed opacity-60" : "hover:bg-surface-container-low cursor-pointer"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 shrink-0 rounded border flex items-center justify-center",
                            checked ? "bg-primary border-primary" : "border-outline"
                          )}
                        >
                          {checked && <Check className="w-3 h-3 text-on-primary" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-mono text-[11px] leading-[14px] text-primary">{unit.code}</span>
                          <span className="block text-[13px] leading-[18px] text-on-surface truncate">{unit.title}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-surface-container-high/30 bg-surface-container-low">
            {!isComplete && (
              <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                {electiveLimit === 0 ? "All modules are required" : `Select ${electiveLimit - selectedElectives.length} more`}
              </span>
            )}
            <button
              type="button"
              disabled={!isComplete}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-[14px] font-[500] leading-[20px] transition-opacity enabled:hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <LockKeyhole className="w-4 h-4" />
              Enroll
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
