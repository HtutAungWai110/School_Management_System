"use client"

import { Hash, Layers } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ModulesPanelShell } from "./modules-panel-shell.component"
import type { Module } from "@/types/module.type"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">{label}</p>
      <p className="text-[14px] font-[600] leading-[20px] text-on-surface">{value}</p>
    </div>
  )
}

interface ModulesViewPanelProps {
  module: Module
  onClose: () => void
}

export function ModulesViewPanel({ module, onClose }: ModulesViewPanelProps) {
  return (
    <ModulesPanelShell
      title="Module details"
      subtitle={module.title}
      codeChip={module.code}
      onClose={onClose}
      className="max-w-[480px]"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-x-6">
            <Field label="Code" value={module.code} />
            <Field label="Title" value={module.title} />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Levels & requirements
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-on-surface-variant">
                The levels this module covers and how each is required.
              </p>
            </div>

            {module.modules_level.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/50 px-6 py-8 text-center">
                <Layers className="mx-auto size-5 text-on-surface-variant/70" />
                <p className="mt-2 text-[13px] font-[600] text-on-surface">No levels assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {module.modules_level.map((ml) => (
                  <div
                    key={ml.levels.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low/30 px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Hash className="size-4 shrink-0 text-on-surface-variant" />
                      <span className="truncate text-[13px] font-[600] leading-[18px] text-on-surface">
                        {ml.levels.description}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-0.5 rounded-full border text-[12px] font-[500] leading-[16px] capitalize text-on-background/10 bg-primary-fixed/50`}
                    >
                      {ml.required}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="flex justify-end border-t border-outline-variant/20 bg-surface-container-low/20 px-6 py-4">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </footer>
      </div>
    </ModulesPanelShell>
  )
}
