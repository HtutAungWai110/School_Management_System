import Link from "next/link"
import { ArrowLeft, Megaphone } from "lucide-react"

import { AnnouncementCard } from "@/components/announcements/announcement-card.component"
import { createClient } from "@/lib/supabase/server.client"
import { serverFetch } from "@/lib/server.service"
import type { Announcement } from "@/types/announcement.type"

export default async function StudentBatchAnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  /* RLS only returns this batch when the student is assigned to it, so the
     lookup doubles as the access check without pulling the whole roster. */
  const supabase = await createClient()
  const [batchResult, announcementsRes] = await Promise.all([
    supabase.from("batches").select("id, batch_name").eq("id", id).maybeSingle(),
    serverFetch(`http://localhost:3000/api/batches/${id}/announcements`, { cache: "no-store" }),
  ])

  const batch = batchResult.data as { id: string; batch_name: string } | null

  const announcementsJson = announcementsRes.ok
    ? await announcementsRes.json().catch(() => [])
    : []
  const announcements = (
    Array.isArray(announcementsJson) ? announcementsJson : []
  ) as Announcement[]

  const batchHref = `/student/dashboard/batches/${id}`

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <Link
        href={batchHref}
        className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant transition-colors duration-200 hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to batch
      </Link>

      <div className="mx-auto mt-6 w-full max-w-[600px] lg:max-w-[680px] xl:max-w-[820px]">
        {!batch ? (
          <div className="rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
            <Megaphone className="mx-auto size-8 text-on-surface-variant" />
            <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">
              Batch not found
            </p>
            <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
              You may not be assigned to this batch, or it may have been removed.
            </p>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Noticeboard
              </p>
              <h1 className="mt-1 truncate text-[28px] font-[800] leading-[36px] text-on-surface">
                {batch.batch_name}
              </h1>
              <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                {announcements.length === 0
                  ? "Nothing posted to this batch yet."
                  : `${announcements.length} announcement${announcements.length === 1 ? "" : "s"} · newest first`}
              </p>
            </div>

            {announcements.length === 0 ? (
              <div className="mt-10 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-16 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                  <Megaphone className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-[18px] font-[700] leading-[26px] text-on-surface">
                  Nothing posted yet
                </h2>
                <p className="mx-auto mt-1 max-w-sm text-[14px] leading-[20px] text-on-surface-variant">
                  Announcements published here appear for every student and
                  teacher in {batch.batch_name}.
                </p>
              </div>
            ) : (
              <ol className="mt-8 space-y-6">
                {announcements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                    currentUserId={null}
                    href={`/student/dashboard/batches/${id}/announcements/${announcement.id}`}
                  />
                ))}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  )
}
