"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Check, Lock } from "lucide-react"

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

  const { electiveLimit } = getLevelRule(level.description)

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
    <div className="w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-on-primary text-[14px] font-medium transition-opacity hover:opacity-90"
      >
        Enroll Course
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="flex">
          <ChevronDown className="w-4 h-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl bg-surface-container-lowest shadow-sm">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-baseline justify-center gap-2">
                  <h3 className="text-[13px] font-medium text-on-surface">Select modules</h3>
                  <span className="text-[12px] text-on-surface-variant">
                    {electiveLimit === 0
                      ? "all required"
                      : `${selectedElectives.length} of ${electiveLimit} elective${electiveLimit === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="mx-auto mt-4 w-full max-w-sm space-y-5">
                {groups.map((group) => {
                  const meta = TYPE_META[group.key]
                  const isLocked = LOCKED.includes(group.key)
                  return (
                    <div key={group.key} className="space-y-1">
                      <div className="flex items-center justify-center gap-1.5 pb-1">
                        <span className={cn("w-1.5 h-1.5 rounded-full", meta.dot)} />
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-variant">
                          {meta.label}
                        </span>
                        {isLocked && <Lock className="w-3 h-3 text-outline" />}
                      </div>

                      {group.units.map((entry) => {
                        const unit = entry.modules
                        const checked = isLocked || selectedElectives.includes(unit.id)
                        const blocked = group.key === "elective" && !checked && atLimit
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            disabled={isLocked || blocked}
                            onClick={() => group.key === "elective" && toggleElective(unit.id)}
                            aria-pressed={checked}
                            title={unit.title}
                            className={cn(
                              "w-full flex items-center justify-center gap-2 rounded-md py-1.5 text-center transition-colors",
                              isLocked || blocked
                                ? "cursor-default text-on-surface-variant"
                                : "cursor-pointer hover:bg-surface-container-low"
                            )}
                          >
                            <span
                              className={cn(
                                "grid place-items-center w-4 h-4 shrink-0 rounded-full transition-colors",
                                checked ? "bg-primary" : "bg-surface-container-high"
                              )}
                            >
                              <AnimatePresence initial={false}>
                                {checked && (
                                  <motion.span
                                    initial={{ scale: 0.4, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.4, opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <Check className="w-2.5 h-2.5 text-on-primary" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </span>
                            <span className="font-mono text-[12px] leading-4 text-primary">{unit.code}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
                </div>
              </div>

              <div className="flex items-center justify-end px-5 py-3.5">
                <button
                  type="button"
                  disabled={!isComplete}
                  className="px-4 py-2 rounded-lg text-[14px] font-medium bg-primary text-on-primary transition-opacity enabled:hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
                >
                  Enroll
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
