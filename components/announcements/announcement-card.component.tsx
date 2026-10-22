import Image from "next/image"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

import { AnnouncementActions } from "./announcement-actions.component"
import { AnnouncementCarousel } from "./announcement-carousel.component"
import { AnnouncementDiscussion } from "./announcement-discussion.component"
import { initialsOf, timeAgo } from "@/lib/format.util"
import type { Announcement } from "@/types/announcement.type"

/** Falls back to the raw value rather than "Invalid URL": a stored link that
 *  somehow fails to parse is still more useful shown than hidden. */
function hostnameOf(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "")
  } catch {
    return value
  }
}

export function AnnouncementCard({
  announcement,
  currentUserId,
  href,
}: {
  announcement: Announcement
  currentUserId: string | null
  /** When set, the announcement body links to its own page instead of plain
   *  text. Used by noticeboard lists so readers can open the exact post. */
  href?: string
}) {
  const author = announcement.profiles
  const authorName = author?.full_name ?? "CodePoint Academy"
  const images = announcement.attachments?.images ?? []
  const links = announcement.attachments?.links ?? []
  const content = announcement.content?.trim() ?? ""
  const age = timeAgo(announcement.created_at)
  const canManage = Boolean(currentUserId && announcement.author_id === currentUserId)

  return (
    <li>
      <article className="overflow-hidden rounded-xl border border-primary/10 bg-surface-container-lowest shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Byline */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3">
          {author?.avatar_url ? (
            <Image
              src={author.avatar_url}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-full object-cover ring-1 ring-black/5"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-fixed text-[11px] font-[700] leading-none text-on-primary-fixed-variant">
              {initialsOf(author?.full_name)}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-[700] leading-[18px] text-on-surface">{authorName}</p>
            <p className="truncate text-[12px] leading-[16px] text-on-surface-variant">
              {author ? "Admin" : "Announcement"}
            </p>
          </div>

          {canManage && (
            <AnnouncementActions
              batchId={announcement.batch_id}
              announcementId={announcement.id}
            />
          )}
        </header>

        {images.length > 0 && <AnnouncementCarousel images={images} />}

        <AnnouncementDiscussion
          batchId={announcement.batch_id}
          announcementId={announcement.id}
          likeCount={announcement.likes_count}
          commentCount={announcement.comments_count}
        >
          {content && href ? (
            <Link href={href} className="block">
              <p className="whitespace-pre-wrap px-4 lg:px-6 pt-1.5 text-[14px] leading-[20px] text-on-surface">
                <span className="font-[700]">{authorName}</span>{" "}
                <span className="font-[400]">{content}</span>
              </p>
            </Link>
          ) : (
            <p className="whitespace-pre-wrap px-4 lg:px-6 pt-1.5 text-[14px] leading-[20px] text-on-surface">
              <span className="font-[700]">{authorName}</span>{" "}
              <span className="font-[400]">{content}</span>
            </p>
          )}

          {links.length > 0 && (
            <div className="space-y-2 px-4 lg:px-6 pt-3">
              {links.map((link) => (
                <a
                  key={`${link.url}-${link.label ?? ""}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-container-high text-on-surface-variant">
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-[600] leading-[18px] text-on-surface">
                      {link.label ?? hostnameOf(link.url)}
                    </span>
                    <span className="block truncate text-[12px] leading-[16px] text-on-surface-variant">
                      {link.label ? hostnameOf(link.url) : "External link"}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          )}

          <p
            className="px-4 lg:px-6 py-3 text-[10px] font-[500] uppercase leading-[16px] tracking-[0.08em] text-on-surface-variant"
            title={age.title}
          >
            {age.label}
          </p>
        </AnnouncementDiscussion>
      </article>
    </li>
  )
}
