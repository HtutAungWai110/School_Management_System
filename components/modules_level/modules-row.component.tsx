"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, MoreVertical, Pencil, Layers, Eye, Trash2 } from "lucide-react"

import type { Level, Module } from "@/types/module.type"
import { ModulesLevelTemplate } from "./modules-level-template.component"
import { ModulesRenamePanel } from "./modules-rename-panel.component"
import { ModulesLevelsPanel } from "./modules-levels-panel.component"
import { ModulesViewPanel } from "./modules-view-panel.component"
import { ModulesDeletePanel } from "./modules-delete-panel.component"

export function ModulesRow({ module, levels }: {
  module: Module
  levels: Level[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [levelsOpen, setLevelsOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
              <BookOpen className="w-5 h-5 text-on-primary-fixed-variant" />
            </div>
            <span className="text-[14px] font-[600] leading-[20px] text-on-surface">{module.code}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <p className="text-[16px] leading-[24px] font-bold text-on-surface">{module.title}</p>
        </td>
        <td className="px-6 py-4">
          <ModulesLevelTemplate modulesLevel={module.modules_level} />
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              aria-label="Module actions"
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
                    label: "Rename",
                    icon: Pencil,
                    onClick: () => {
                      setMenuOpen(false)
                      setRenameOpen(true)
                    },
                  },
                  {
                    label: "Edit levels",
                    icon: Layers,
                    onClick: () => {
                      setMenuOpen(false)
                      setLevelsOpen(true)
                    },
                  },
                  {
                    label: "View",
                    icon: Eye,
                    onClick: () => {
                      setMenuOpen(false)
                      setViewOpen(true)
                    },
                  },
                  {
                    label: "Delete",
                    icon: Trash2,
                    onClick: () => {
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    },
                  },
                ].map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Icon className="w-4 h-4 text-on-surface-variant" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
      {renameOpen && <ModulesRenamePanel module={module} onClose={() => setRenameOpen(false)} />}
      {levelsOpen && <ModulesLevelsPanel module={module} levels={levels} onClose={() => setLevelsOpen(false)} />}
      {viewOpen && <ModulesViewPanel module={module} onClose={() => setViewOpen(false)} />}
      {deleteOpen && <ModulesDeletePanel module={module} onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
