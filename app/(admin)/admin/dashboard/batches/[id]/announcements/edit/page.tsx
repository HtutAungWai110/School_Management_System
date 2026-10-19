import Link from "next/link"
import { ArrowLeft, CircleHelp, Megaphone } from "lucide-react"

import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { AnnouncementComposer } from "@/components/announcements/announcement-composer.component"
import { createClient } from "@/lib/supabase/server.client"
import { serverFetch } from "@/lib/server.service"
import type { Announcement } from "@/types/announcement.type"
import type { Batch } from "@/types/batch.type"

function Notice({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
      <Megaphone className="mx-auto size-8 text-on-surface-variant" />
      <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">{title}</p>
      <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">{description}</p>
    </div>
  )
}

export default async function EditAnnouncementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await params
  const { id: announcementId } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [batchRes, announcementRes] = await Promise.all([
    serverFetch(`http://localhost:3000/api/batches/${id}`, { next: { revalidate: 120 } }),
    /* Editing must never open on a cached copy: the admin is about to overwrite
       it, and a stale revision would silently undo someone else's save. */
    announcementId
      ? serverFetch(`http://localhost:3000/api/batches/${id}/announcements/${announcementId}`, {
          cache: "no-store",
        })
      : Promise.resolve(null),
  ])

  const batchJson = await batchRes.json().catch(() => null)
  const batch = (batchJson?.data ?? null) as Batch | null

  const announcementJson = announcementRes ? await announcementRes.json().catch(() => null) : null
  const announcement = (announcementJson?.data ?? null) as Announcement | null
  const canEdit = Boolean(announcement && user && announcement.author_id === user.id)

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Edit announcement</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <Link
            href={`/admin/dashboard/batches/${id}/announcements`}
            className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant hover:text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to announcements
          </Link>

          <div className="mt-6">
            {!batch ? (
              <Notice
                title="Batch not found"
                description="You cannot edit an announcement for a batch that no longer exists."
              />
            ) : !announcementId ? (
              <Notice
                title="No announcement selected"
                description="Open the noticeboard and use the menu on a post you wrote."
              />
            ) : !announcement ? (
              <Notice
                title="Announcement not found"
                description="It may have been deleted, or the link is missing a valid id."
              />
            ) : !canEdit ? (
              <Notice
                title="Not your announcement"
                description="Only the admin who published a notice can edit or delete it."
              />
            ) : (
              <AnnouncementComposer
                key={announcement.id}
                batchId={id}
                batchName={batch.batch_name}
                announcement={announcement}
              />
            )}
          </div>
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 py-6 sm:px-6 lg:px-12 w-full max-w-[1440px] mx-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">CodePoint Academy</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">© 2024 ScholarlyAdmin School Management System</span>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
                <a key={link} href="#" className="text-[12px] font-[500] leading-[16px] text-on-surface-variant hover:text-primary transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
