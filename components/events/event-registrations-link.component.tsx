"use client";

import Link from "next/link";
import { Users } from "lucide-react";

import { useProfileStore } from "@/components/profile/profile.state";

/**
 * The admin shortcut from a post into its registration list.
 *
 * Decided from the global profile store so the server-rendered card does not
 * have to know who is reading it. The API re-checks the admin role too: hiding
 * a link is not an authorization boundary.
 */
export function EventRegistrationsLink({
  announcementId,
}: {
  announcementId: string;
}) {
  const { profile, hydrated } = useProfileStore();

  if (!hydrated || profile.role !== "admin") return null;

  return (
    <Link
      href={`/admin/announcements/registrations?announcement_id=${announcementId}`}
      className="inline-flex items-center gap-1 rounded-full border border-outline-variant/30 px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Users className="size-3.5" aria-hidden="true" />
      View registrations
    </Link>
  );
}
