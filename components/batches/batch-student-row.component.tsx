"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { MoreVertical, UserMinus } from "lucide-react"

import type { BatchAssignment } from "@/types/batch.type"
import { refetchData } from "@/lib/action.action"
import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export function BatchStudentRow({ assignment, batchId }: { assignment: BatchAssignment; batchId: string }) {
  const profile = assignment.profiles
  const pathname = usePathname()

  const [menuOpen, setMenuOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
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

  async function handleRemove() {
    setRemoveError(null)
    setIsRemoving(true)

    try {
      const res = await fetch(`/api/batches/${batchId}/assignments/${assignment.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Something went wrong while removing the student.")
      }

      await refetchData(pathname)
      setRemoveOpen(false)
    } catch (error) {
      setRemoveError(error instanceof Error ? error.message : "Something went wrong.")
    } finally {
      setIsRemoving(false)
    }
  }

  if (!profile) return null

  return (
    <>
      <li className="border-b border-primary/10 px-6 py-4 flex items-center gap-4">
        {profile.avatar_url ? (
          <Image
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/20"
            src={profile.avatar_url}
            alt={profile.full_name}
            width={40}
            height={40}
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-on-surface-variant text-sm shrink-0">
            {getInitials(profile.full_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-[600] leading-[20px] text-on-surface truncate">
            {profile.full_name}
          </p>
          <p className="text-[13px] leading-[18px] text-on-surface-variant truncate">
            {profile.email}
          </p>
          {profile.student_enrollments && profile.student_enrollments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.student_enrollments.map((enrollment) =>
                enrollment.modules ? (
                  <span
                    key={enrollment.modules.id}
                    className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-secondary-container/60 text-[11px] font-[600] leading-[14px]"
                  >
                    {enrollment.modules.code}
                    <span className="text-on-surface-variant font-[500]">
                      {enrollment.modules.title}
                    </span>
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
            Added {formatDate(assignment.assigned_at)}
          </span>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Student actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-[170px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    setRemoveError(null)
                    setRemoveOpen(true)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserMinus className="w-4 h-4 text-destructive" />
                  Remove from batch
                </button>
              </div>
            )}
          </div>
        </div>
      </li>

      <ConfirmDialog
        open={removeOpen}
        title="Remove from batch?"
        description={
          removeError ??
          `Remove ${profile.full_name} from this batch? They will lose access to batch-specific resources.`
        }
        confirmLabel="Remove"
        variant="destructive"
        isSubmitting={isRemoving}
        onConfirm={() => void handleRemove()}
        onCancel={() => {
          setRemoveOpen(false)
          setRemoveError(null)
        }}
      />
    </>
  )
}
