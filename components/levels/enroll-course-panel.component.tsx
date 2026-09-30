"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronDown, Check, Lock, Loader2, CircleAlert } from "lucide-react"

import { cn } from "@/lib/utils.util"
import { TYPE_META, type TypeKey, type ModuleEntry, getLevelRule } from "./level-utils"

const GROUP_ORDER: TypeKey[] = ["core", "mandatory", "specialist", "elective"]
const LOCKED: TypeKey[] = ["core", "mandatory", "specialist"]

type EnrollStatus = "idle" | "loading" | "success" | "error"

interface EnrollmentResult {
  data: unknown
  error: { message: string } | null
  status: number
  statusText: string
}

interface Props {
  level: { id: string; description: string; modules_level: ModuleEntry[] }
}

export default function EnrollCoursePanel({ level }: Props) {
  const [open, setOpen] = useState(false)
  const [selectedElectives, setSelectedElectives] = useState<string[]>([])
  const [status, setStatus] = useState<EnrollStatus>("idle")
  const [message, setMessage] = useState("")

  const { electiveLimit } = getLevelRule(level.description)

  const groups = GROUP_ORDER.map((key) => ({
    key,
    units: level.modules_level.filter((m) => m.required === key),
  })).filter((g) => g.units.length > 0)

  const atLimit = selectedElectives.length >= electiveLimit
  const isComplete = selectedElectives.length === electiveLimit
  const isBusy = status === "loading"

  function toggleElective(id: string) {
    setStatus("idle")
    setMessage("")
    setSelectedElectives((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : prev.length < electiveLimit ? [...prev, id] : prev
    )
  }

  async function handleEnroll() {
    const payload = level.modules_level
      .filter((entry) => LOCKED.includes(entry.required as TypeKey) || selectedElectives.includes(entry.modules.id))
      .map((entry) => ({ level_id: level.id, module_id: entry.modules.id }))

    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setMessage(data?.error ?? "Enrollment failed. Please try again.")
        return
      }

      const results: EnrollmentResult[] = data?.enrollmentResults ?? []
      const succeeded = results.filter((r) => r?.error == null).length
      const failed = results.length - succeeded

      if (succeeded === 0) {
        setStatus("error")
        setMessage(results[0]?.error?.message ?? "Enrollment failed. Please try again.")
        return
      }

      setStatus("success")
      setMessage(
        failed > 0
          ? `${succeeded} of ${results.length} modules enrolled · ${failed} failed`
          : `${succeeded} module${succeeded === 1 ? "" : "s"} enrolled successfully`
      )
    } catch {
      setStatus("error")
      setMessage("Could not reach the server. Please try again.")
    }
  }

  return (
    <div className="w-full lg:w-fit">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="group inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface text-[14px] font-medium transition-colors hover:opacity-80"
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
            <div className="mt-3 rounded-xl border border-border bg-card">
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[13px] font-medium text-on-surface">Select modules</h3>
                  <span className="text-[12px] text-on-surface-variant">
                    {electiveLimit === 0
                      ? "all required"
                      : `${selectedElectives.length} of ${electiveLimit} elective${electiveLimit === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="mt-4 w-full max-w-2xl space-y-5">
                {groups.map((group) => {
                  const meta = TYPE_META[group.key]
                  const isLocked = LOCKED.includes(group.key)
                  return (
                    <div key={group.key} className="space-y-1">
                      <div className="flex items-center gap-1.5 pb-1">
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
                            disabled={isLocked || blocked || isBusy}
                            onClick={() => group.key === "elective" && toggleElective(unit.id)}
                            aria-pressed={checked}
                            className={cn(
                              "w-full flex items-center gap-2.5 rounded-md py-1.5 text-left transition-colors",
                              isLocked || blocked || isBusy
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
                            <span className="text-[13px] leading-[18px] text-pretty">{unit.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <AnimatePresence mode="wait" initial={false}>
                    {status === "success" && (
                      <motion.p
                        key="success"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-1.5 text-[13px] leading-[18px] text-on-surface"
                      >
                        <Check className="w-4 h-4 shrink-0 text-primary" />
                        {message}
                      </motion.p>
                    )}
                    {status === "error" && (
                      <motion.p
                        key="error"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-1.5 text-[13px] leading-[18px] text-error"
                      >
                        <CircleAlert className="w-4 h-4 shrink-0 mt-px" />
                        {message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {status !== "success" && (
                  <button
                    type="button"
                    disabled={!isComplete || isBusy}
                    onClick={handleEnroll}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium bg-primary text-on-primary transition-opacity enabled:hover:opacity-90 disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isBusy ? "Enrolling" : "Enroll"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
