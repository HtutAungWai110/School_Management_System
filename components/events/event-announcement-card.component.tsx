import Image from "next/image";
import { CalendarDays, Clock, ExternalLink, Heart, Users } from "lucide-react";

import { AnnouncementCarousel } from "@/components/announcements/announcement-carousel.component";
import { EventAnnouncementActions } from "./event-announcement-actions.component";
import { initialsOf, timeAgo } from "@/lib/format.util";
import type { EventAnnouncement } from "@/types/event-announcement.type";

/** `start_date` is a plain date, so it is parsed as local midnight rather than
 *  UTC — otherwise every event would appear a day earlier west of Greenwich. */
function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDeadline(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

/**
 * One post in the campus feed: byline first, then whatever the admin actually
 * published — text, images, links, or an event schedule. Deliberately
 * borderless so consecutive posts read as a stream rather than a table.
 */
export function EventAnnouncementCard({
  announcement,
}: {
  announcement: EventAnnouncement;
}) {
  const isEvent = announcement.type === "event";
  const author = announcement.profiles;
  const authorName = author?.full_name ?? "CodePoint Admin";
  const posted = timeAgo(announcement.created_at);
  const content = announcement.content?.trim() ?? "";
  const images = announcement.data?.attachments?.images ?? [];
  const links = announcement.data?.attachments?.links ?? [];

  return (
    <article className="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,23,42,0.05),0_20px_44px_-38px_rgba(15,23,42,0.45)]">
      <header className="flex items-center gap-3 px-4 py-3.5 lg:px-5">
        {author?.avatar_url ? (
          <Image
            src={author.avatar_url}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="size-10 shrink-0 rounded-full object-cover ring-1 ring-black/5"
          />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-fixed text-[12px] font-bold text-on-primary-fixed-variant">
            {initialsOf(author?.full_name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold leading-[18px] text-on-surface">
            {authorName}
          </p>
          <p className="truncate text-[12px] leading-4 text-on-surface-variant">
            <span title={posted.title}>{posted.label}</span>
            <span aria-hidden="true"> · </span>
            {isEvent ? "Campus event" : "Campus update"}
          </p>
        </div>

        <span
          className={
            isEvent
              ? "shrink-0 rounded-full bg-primary-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-primary"
              : "shrink-0 rounded-full bg-secondary-fixed px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-on-secondary-fixed"
          }
        >
          {isEvent ? "Event" : "Notice"}
        </span>

        <EventAnnouncementActions
          announcementId={announcement.id}
          authorId={announcement.author_id}
        />
      </header>

      {content && (
        <p className="whitespace-pre-line px-4 pb-3.5 text-[15px] leading-6 text-on-surface lg:px-5">
          {content}
        </p>
      )}

      {images.length > 0 && <AnnouncementCarousel images={images} />}

      {links.length > 0 && (
        <div className="space-y-2 px-4 py-3 lg:px-5">
          {links.map((link) => (
            <a
              key={`${link.url}-${link.label ?? ""}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-container-high text-on-surface-variant">
                <ExternalLink className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold leading-[18px] text-on-surface">
                  {link.label ?? hostnameOf(link.url)}
                </span>
                <span className="block truncate text-[12px] leading-4 text-on-surface-variant">
                  {link.label ? hostnameOf(link.url) : "External link"}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}

      {isEvent && (
        <div className={content || images.length > 0 || links.length > 0 ? "px-4 pb-3.5 lg:px-5" : "px-4 py-3.5 lg:px-5"}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-surface-container-low px-3 py-2.5 text-[12px] font-medium text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4" aria-hidden="true" />
              {formatDate(announcement.start_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {announcement.start_time?.slice(0, 5) ?? "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              Registration closes {formatDeadline(announcement.registration_deadline)}
            </span>
          </div>
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-outline-variant/10 px-4 py-2.5 lg:px-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
          {isEvent ? "Registration open" : "Posted"}
        </span>
        <div className="flex items-center gap-3.5 text-[12px] font-medium text-on-surface-variant">
          {isEvent && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden="true" />
              {announcement.registration_count}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Heart className="size-4" aria-hidden="true" />
            {announcement.like_count}
          </span>
        </div>
      </footer>
    </article>
  );
}
