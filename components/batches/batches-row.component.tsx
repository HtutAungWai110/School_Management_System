"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, MoreVertical, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react"

import type { Batch, BatchStatus } from "@/types/batch.type";
import { cn } from "@/lib/utils.util"
import { refetchData } from "@/lib/action.action"
import { batchPages } from "@/lib/batch-pages"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { BatchStatusBadge } from "./batch-status-badge.component"
import { BatchesRenamePanel } from "./batches-rename-panel.component"
import { BatchesDeletePanel } from "./batches-delete-panel.component"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function BatchesRow({ batch }: { batch: Batch }) {
  const levels = batch.batch_level ?? [];
  const students = batch.batch_assignments ?? [];

  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isCompleted = batch.status === "completed"

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

  async function updateStatus(status: BatchStatus) {
    setStatusError(null)
    setIsUpdatingStatus(true)

    try {
      const res = await fetch(`/api/batches/${batch.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Something went wrong while updating the batch.")
      }

      await refetchData([pathname, ...batchPages])
      setStatusOpen(false)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  return (
    <>
      <tr className="hover:bg-surface-container-low transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center">
              <Users className="w-5 h-5 text-on-primary-fixed-variant" />
            </div>
            <span className="text-[16px] leading-[24px] font-bold text-on-surface">
              <Link
                href={`/admin/dashboard/batches/${batch.id}`}
                className="hover:text-cyan-500 transition-colors hover:underline"
              >
                {batch.batch_name}
              </Link>
            </span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {levels.length === 0 ? (
              <span className="text-[14px] leading-[20px] text-on-surface-variant">No levels</span>
            ) : (
              levels.map((bl) => (
                <span
                  key={bl.id}
                  className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
                >
                  {bl.levels.description}
                </span>
              ))
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {students.length} student{students.length === 1 ? "" : "s"}
        </td>
        <td className="px-6 py-4">
          <BatchStatusBadge status={batch.status ?? null} />
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {formatDate(batch.created_at)}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              aria-label="Batch actions"
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
                    label: isCompleted ? "Reopen" : "Mark complete",
                    icon: isCompleted ? RotateCcw : CheckCircle2,
                    onClick: () => {
                      setMenuOpen(false)
                      setStatusError(null)
                      setStatusOpen(true)
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
      {renameOpen && <BatchesRenamePanel batch={batch} onClose={() => setRenameOpen(false)} />}
      {deleteOpen && <BatchesDeletePanel batch={batch} onClose={() => setDeleteOpen(false)} />}

      <ConfirmDialog
        open={statusOpen}
        title={isCompleted ? "Reopen batch?" : "Mark batch as complete?"}
        description={
          statusError ??
          (isCompleted
            ? `Reopen "${batch.batch_name}" so students can be assigned to it again?`
            : `Mark "${batch.batch_name}" as completed?`)
        }
        confirmLabel={isCompleted ? "Reopen" : "Mark complete"}
        isSubmitting={isUpdatingStatus}
        onConfirm={() => void updateStatus(isCompleted ? "ongoing" : "completed")}
        onCancel={() => {
          setStatusOpen(false)
          setStatusError(null)
        }}
      />
    </>
  );
}
