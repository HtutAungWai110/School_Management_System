"use client"

import { useEffect, useRef, useState } from "react"
import { Layers, MoreVertical, Pencil, Trash2 } from "lucide-react"

import type { Level } from "@/types/module.type"
import { cn } from "@/lib/utils.util"
import { LevelsRenamePanel } from "./levels-rename-panel.component"
import { LevelsDeletePanel } from "./levels-delete-panel.component"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function LevelsRow({ level }: { level: Level }) {
  const modules = level.modules_level ?? []

  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
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
            <div className="w-10 h-10 rounded-lg bg-primary-fixed/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-on-primary-fixed-variant" />
            </div>
            <span className="text-[16px] leading-[24px] font-bold text-on-surface">{level.description}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {modules.length === 0 ? (
              <span className="text-[14px] leading-[20px] text-on-surface-variant">No modules</span>
            ) : (
              modules.map((ml) => (
                <span
                  key={ml.modules.id}
                  className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
                >
                  {ml.modules.code} · {ml.modules.title}
                </span>
              ))
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {formatDate(level.created_at)}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              aria-label="Level actions"
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
      {renameOpen && <LevelsRenamePanel level={level} onClose={() => setRenameOpen(false)} />}
      {deleteOpen && <LevelsDeletePanel level={level} onClose={() => setDeleteOpen(false)} />}
    </>
  )
}
