import { AssignmentsPanel } from "@/components/assignments/assignments-panel.component"
import { CircleHelp } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell.component"

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminAssignmentsPage({ searchParams }: PageProps) {
  /* Only `page` is forwarded. The panel owns fetching, so the page's job here
     is to hand it the current page and let PaginationNav drive navigation by
     rewriting this same URL. */
  const { page } = await searchParams
  const currentPage = Math.max(parseInt(page ?? "1", 10) || 1, 1)

  return (
    /* `lg:ml-64` is load-bearing: the admin layout renders the sidebar as a
       fixed 256px rail and applies no offset of its own, so every admin page
       has to clear it here or the rail sits on top of the content. */
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Assignments</h1>
            <div className="flex items-center gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <AssignmentsPanel
            endpoint="/api/assignments"
            page={currentPage}
            subtitle="Turned-in work across every assignment, soonest deadline first."
          />
        </div>
      </main>
    </div>
  )
}