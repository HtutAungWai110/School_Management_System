import { AssignmentsPanel } from "@/components/assignments/assignments-panel.component"
import { CircleHelp } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell.component"

interface PageProps {
  /** `id` is the assignment and `submissionId` a student_assignments row; a
   *  submission notification links to both at once. */
  searchParams: Promise<{ page?: string; id?: string; submissionId?: string }>
}

export default async function AdminAssignmentsPage({ searchParams }: PageProps) {
  /* The panel owns fetching, so the page's job here is to hand it the current
     page and let PaginationNav drive navigation by rewriting this same URL.
     `id` and `submissionId` are forwarded verbatim so a notification link
     survives a page change. */
  const { page, id, submissionId } = await searchParams
  const currentPage = Math.max(parseInt(page ?? "1", 10) || 1, 1)

  let endpoint = `/api/assignments?page=${currentPage}`
  if (id) {
    endpoint += `&id=${encodeURIComponent(id)}`
  }
  if (submissionId) {
    endpoint += `&submissionId=${encodeURIComponent(submissionId)}`
  }

  return (
    /* `lg:ml-64` is load-bearing: the admin layout renders the sidebar as a
       fixed 256px rail and applies no offset of its own, so every admin page
       has to clear it here or the rail sits on top of the content. */
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-auto sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Assignments</h1>
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
<AssignmentsPanel
            endpoint={endpoint}
            page={currentPage}
            subtitle="Turned-in work across every assignment, soonest deadline first."
          />
        </div>
      </main>
    </div>
  )
}