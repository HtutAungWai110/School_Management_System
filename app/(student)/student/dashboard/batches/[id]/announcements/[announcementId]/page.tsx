import Link from "next/link"
import { ArrowLeft, Megaphone } from "lucide-react"

import { AnnouncementCard } from "@/components/announcements/announcement-card.component"
import { createClient } from "@/lib/supabase/server.client"
import { serverFetch } from "@/lib/server.service"
import type { Announcement } from "@/types/announcement.type"

export default async function StudentBatchAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string; announcementId: string }>
}) {
  const { id, announcementId } = await params

  /* RLS only returns this batch when the student is assigned to it, so the
     lookup doubles as the access check without pulling the whole roster. */
  const supabase = await createClient()
  const [batchResult, announcementRes] = await Promise.all([
    supabase.from("batches").select("id, batch_name").eq("id", id).maybeSingle(),
    serverFetch(
      `http://localhost:3000/api/batches/${id}/announcements/${announcementId}`,
      { cache: "no-store" }
    ),
  ])

  const batch = batchResult.data as { id: string; batch_name: string } | null

  const announcementJson = announcementRes.ok
    ? await announcementRes.json().catch(() => null)
    : null
  const announcement = announcementJson?.data as Announcement | null

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <Link
        href={`/student/dashboard/batches/${id}/announcements`}
        className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant transition-colors duration-200 hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Back to noticeboard
      </Link>

      <div className="mx-auto mt-6 w-full max-w-[600px] lg:max-w-[680px] xl:max-w-[820px]">
        {!batch || !announcement ? (
          <div className="rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
            <Megaphone className="mx-auto size-8 text-on-surface-variant" />
            <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">
              Announcement not found
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
            </div>

            <ol className="mt-8 space-y-6">
              <li>
                <AnnouncementCard
                  announcement={announcement}
                  currentUserId={null}
                  href={`/student/dashboard/batches/${id}/announcements/${announcementId}`}
                />
              </li>
            </ol>
          </>
        )}
      </div>
    </div>
  )
}
