import Link from "next/link"
import { ArrowLeft, CircleHelp, Megaphone } from "lucide-react"

import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { AnnouncementCard } from "@/components/announcements/announcement-card.component"
import { buttonVariants } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server.client"
import { serverFetch } from "@/lib/server.service"
import { cn } from "@/lib/utils.util"
import type { Announcement } from "@/types/announcement.type"
import type { Batch } from "@/types/batch.type"

export default async function BatchAnnouncementsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  /* Only the author gets the kebab, so the page has to know who is looking.
     The API still re-checks authorship on write. */
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [batchRes, announcementsRes] = await Promise.all([
    serverFetch(`http://localhost:3000/api/batches/${id}`, { next: { revalidate: 120 } }),
    serverFetch(`http://localhost:3000/api/batches/${id}/announcements`, { cache: "no-store" }),
  ])

  const batchJson = await batchRes.json().catch(() => null)
  const batch = (batchJson?.data ?? null) as Batch | null

  const announcementsJson = await announcementsRes.json().catch(() => [])
  const announcements = (Array.isArray(announcementsJson) ? announcementsJson : []) as Announcement[]

  const createHref = `/admin/dashboard/batches/${id}/announcements/create`

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Announcements</h1>
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
          <div className="mx-auto w-full max-w-[600px] lg:max-w-[680px] xl:max-w-[820px]">
            <Link
              href={`/admin/dashboard/batches/${id}`}
              className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant hover:text-primary transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to batch
            </Link>

            {!batch ? (
              <div className="mt-8 rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
                <Megaphone className="mx-auto size-8 text-on-surface-variant" />
                <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">Batch not found</p>
                <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                  This batch may have been deleted or never existed.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Noticeboard
                    </p>
                    <h2 className="mt-1 truncate text-[28px] font-[800] leading-[36px] text-on-surface">
                      {batch.batch_name}
                    </h2>
                    <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                      {announcements.length === 0
                        ? "Nothing posted to this batch yet."
                        : `${announcements.length} announcement${announcements.length === 1 ? "" : "s"} · newest first`}
                    </p>
                  </div>

                  <Link
                    href={createHref}
                    className={cn(buttonVariants({ size: "lg" }), "w-full justify-center px-4 sm:w-auto")}
                  >
                    <Megaphone className="size-4" aria-hidden="true" />
                    Create announcement
                  </Link>
                </div>

                {announcements.length === 0 ? (
                  <div className="mt-10 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest px-6 py-16 text-center">
                    <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                      <Megaphone className="size-6" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-[18px] font-[700] leading-[26px] text-on-surface">
                      Nothing posted yet
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-[14px] leading-[20px] text-on-surface-variant">
                      Announcements published here appear for every student and teacher in {batch.batch_name}.
                    </p>
                    <Link href={createHref} className={cn(buttonVariants({ size: "lg" }), "mt-6 px-4")}>
                      Create the first announcement
                    </Link>
                  </div>
                ) : (
                  <ol className="mt-8 space-y-6">
                    {announcements.map((announcement) => (
                      <AnnouncementCard
                        key={announcement.id}
                        announcement={announcement}
                        currentUserId={user?.id ?? null}
                      />
                    ))}
                  </ol>
                )}
              </>
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
