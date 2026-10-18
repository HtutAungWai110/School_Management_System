import { AssignmentsPanel } from "@/components/assignments/assignments-panel.component"
import { NotificationBell } from "@/components/notifications/notification-bell.component"

interface PageProps {
  /** `id` is the assignment and `submissionId` a student_assignments row; a
   *  submission notification links to both at once. */
  searchParams: Promise<{ id?: string; submissionId?: string }>
}

export default async function TeacherAssignmentsPage({ searchParams }: PageProps) {
  const { id, submissionId } = await searchParams

  let endpoint = "/api/teacher/assignments"
  const query = [
    id ? `id=${encodeURIComponent(id)}` : null,
    submissionId ? `submissionId=${encodeURIComponent(submissionId)}` : null,
  ].filter(Boolean)

  if (query.length > 0) {
    endpoint += `?${query.join("&")}`
  }
  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Assignments</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <span className="font-label-md text-label-md">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <AssignmentsPanel
            endpoint={endpoint}
            subtitle="Work your students have turned in, across every batch you teach."
          />
        </div>
      </main>
    </div>
  )
}