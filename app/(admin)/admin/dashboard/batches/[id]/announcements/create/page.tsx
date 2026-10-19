import Link from "next/link"
import { ArrowLeft, CircleHelp, Megaphone } from "lucide-react"

import { NotificationBell } from "@/components/notifications/notification-bell.component"
import { AnnouncementComposer } from "@/components/announcements/announcement-composer.component"
import { serverFetch } from "@/lib/server.service"
import type { Batch } from "@/types/batch.type"

export default async function CreateAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const batchRes = await serverFetch(`http://localhost:3000/api/batches/${id}`, {
    next: { revalidate: 120 },
  })
  const batchJson = await batchRes.json().catch(() => null)
  const batch = (batchJson?.data ?? null) as Batch | null

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">New announcement</h1>
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
            {batch ? (
              <AnnouncementComposer batchId={id} batchName={batch.batch_name} />
            ) : (
              <div className="rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
                <Megaphone className="mx-auto size-8 text-on-surface-variant" />
                <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">Batch not found</p>
                <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                  You cannot write an announcement for a batch that no longer exists.
                </p>
              </div>
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
