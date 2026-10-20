import { NotificationBell } from "@/components/notifications/notification-bell.component"
import StudentBatchList from "@/components/students/student-batch-list.component"
import { serverFetch } from "@/lib/server.service"
import type { BatchListItem } from "@/types/batch.type"
import type { StudentBatch } from "@/types/student-batch.type"

/** `/api/batches` returns batch summaries with an aggregated student count;
 *  this page only needs the fields the student list uses. Row-level security
 *  limits a teacher to the batches they actually teach. */
function toBatchSummary(batch: BatchListItem): StudentBatch {
  return {
    id: batch.id,
    batch_name: batch.batch_name,
    created_at: batch.created_at,
    status: batch.status,
    levels: (batch.batch_level ?? [])
      .map((item) => item.levels?.description)
      .filter((level): level is string => Boolean(level)),
  }
}

export default async function TeacherBatchesPage() {
  const response = await serverFetch("http://localhost:3000/api/batches", {
    // Scoped to the signed-in teacher by RLS, so never cache across users.
    cache: "no-store",
  })

  const data = response.ok ? ((await response.json()) as BatchListItem[]) : []
  const batches = data.map(toBatchSummary)

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Batches</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <span className="font-label-md text-label-md">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <p className="mb-6 text-[14px] leading-5 text-on-surface-variant">
            The batches you teach.
          </p>

          <StudentBatchList
            batches={batches}
            basePath="/teacher/dashboard/batches"
            emptyTitle="No batches assigned"
            emptyDescription="Batches appear here when you are scheduled to teach them."
          />
        </div>
      </main>
    </div>
  )
}
