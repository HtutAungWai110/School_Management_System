import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EventAnnouncementsList } from "./event-announcements-list.component";
import type { EventAnnouncement } from "@/types/event-announcement.type";

/**
 * The landing-page cut: the ten newest posts, capped visually with a fade so
 * the portal home stays a summary rather than a second list page.
 */
export function EventAnnouncementsPreview({
  announcements,
}: {
  announcements: EventAnnouncement[];
}) {
  return (
    <section className="w-full">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[20px] font-[600] leading-[28px] text-on-surface">
            Latest Events &amp; Announcements
          </h2>
          <p className="text-[14px] leading-[20px] text-on-surface-variant">
            The ten most recent posts from the admin desk
          </p>
        </div>
        <Link
          href="/admin/announcements"
          className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-primary hover:underline sm:self-auto"
        >
          View all
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <EventAnnouncementsList
        announcements={announcements.slice(0, 10)}
        emptyMessage="No events or announcements have been published yet."
      />
    </section>
  );
}
