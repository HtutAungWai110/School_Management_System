"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreVertical, Pencil, Trash2 } from "lucide-react"

import { ConfirmDialog } from "@/components/ui/confirm-dialog.component"
import { refetchData } from "@/lib/action.action"

/** The kebab on a notice the signed-in admin wrote.
 *
 *  Rendering is gated by the author check on the card, but the API re-checks
 *  it too: hiding a control is not an authorization boundary. */
export function AnnouncementActions({
  batchId,
  announcementId,
}: {
  batchId: string
  announcementId: string
}) {
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const listHref = `/admin/dashboard/batches/${batchId}/announcements`
  const editHref = `${listHref}/edit?id=${announcementId}`

  useEffect(() => {
    if (!menuOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  async function remove() {
    setDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/batches/${batchId}/announcements/${announcementId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? "Could not delete the announcement.")
      }

      setConfirmOpen(false)
      await refetchData([listHref, `/admin/dashboard/batches/${batchId}`])
      router.refresh()
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Announcement options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="grid size-8 place-items-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MoreVertical className="size-5" aria-hidden="true" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 min-w-[150px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-1 shadow-lg"
        >
          <Link
            href={editHref}
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] text-on-surface transition-colors hover:bg-surface-container"
          >
            <Pencil className="size-4 text-on-surface-variant" aria-hidden="true" />
            Edit
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false)
              setDeleteError(null)
              setConfirmOpen(true)
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        variant="destructive"
        title="Delete announcement?"
        description={
          deleteError ??
          "This removes the post, its images and every like and comment. It cannot be undone."
        }
        confirmLabel={deleting ? "Deleting" : "Delete"}
        isSubmitting={deleting}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (deleting) return
          setConfirmOpen(false)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
