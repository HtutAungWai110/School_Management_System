import { serverFetch } from "@/lib/server.service"

import StudentBatchDetail from "@/components/students/student-batch-detail.component"
import type { StudentBatchDetail as BatchDetail } from "@/types/student-batch-detail.type"

export default async function StudentBatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const res = await serverFetch(`http://localhost:3000/api/student/batches/${id}`, {
    // Cookie-scoped per student, so it must never be cached across users.
    cache: "no-store",
  })

  // Checked rather than assumed: the roster RPC authorises on its own and will
  // reject a caller who does not belong to this batch.
  if (!res.ok) {
    return (
      <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">
          We couldn&apos;t open this batch
        </h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          You may not be assigned to this batch, or it may have been removed. Try again from your
          list of batches.
        </p>
      </div>
    )
  }

  const batch = (await res.json()) as BatchDetail

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <StudentBatchDetail batch={batch} />
    </div>
  )
}