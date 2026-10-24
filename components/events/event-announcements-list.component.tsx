import { CalendarDays } from "lucide-react";

import { EventAnnouncementCard } from "./event-announcement-card.component";
import { cn } from "@/lib/utils.util";
import type { EventAnnouncement } from "@/types/event-announcement.type";

export function EventAnnouncementsList({
  announcements,
  className,
  emptyMessage = "Nothing has been published yet.",
}: {
  announcements: EventAnnouncement[];
  className?: string;
  emptyMessage?: string;
}) {
  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-container-high text-on-surface-variant">
          <CalendarDays className="size-5" />
        </span>
        <p className="text-[14px] leading-5 text-on-surface-variant">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className={cn("flex flex-col gap-5", className)}>
      {announcements.map((announcement) => (
        <li key={announcement.id}>
          <EventAnnouncementCard announcement={announcement} />
        </li>
      ))}
    </ul>
  );
}
