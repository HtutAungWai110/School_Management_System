"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog.component";
import { useProfileStore } from "@/components/profile/profile.state";

/**
 * The kebab on a post the signed-in admin wrote.
 *
 * Visibility is decided from the global profile store, not from a server prop:
 * `ProfileStoreSync` hydrates it in the admin layout, so the control appears
 * only once we know who the reader is. The API re-checks authorship too —
 * hiding a control is not an authorization boundary.
 */
export function EventAnnouncementActions({
  announcementId,
  authorId,
}: {
  announcementId: string;
  authorId: string;
}) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { profile, hydrated } = useProfileStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editHref = `/admin/announcements/${announcementId}/edit`;
  const canManage = hydrated && Boolean(profile.id) && profile.id === authorId;

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function remove() {
    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/event-announcements/${announcementId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Could not delete the post.");
      }

      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Post options"
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
              setMenuOpen(false);
              setDeleteError(null);
              setConfirmOpen(true);
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
        title="Delete post?"
        description={
          deleteError ??
          "This removes the post and its images from storage. It cannot be undone."
        }
        confirmLabel={deleting ? "Deleting" : "Delete"}
        isSubmitting={deleting}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (deleting) return;
          setConfirmOpen(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
