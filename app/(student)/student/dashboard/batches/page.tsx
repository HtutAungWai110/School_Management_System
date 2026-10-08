import { serverFetch } from "@/lib/server.service"

import StudentBatchList from "@/components/students/student-batch-list.component"
import type { StudentBatch } from "@/types/student-batch.type"

export default async function StudentBatchesPage() {
  const batches = ((await serverFetch(
    `http://localhost:3000/api/student/batches`,
    // Cookie-scoped per student, so it must never be cached across users.
    { cache: "no-store" }
  ).then((res) => res.json())) ?? []) as StudentBatch[]

  return (
    <div className="mx-auto w-full max-w-[1440px] px-6 py-8 md:px-10">
      <header className="mb-6">
        <h1 className="text-[24px] font-bold leading-8 tracking-tight text-primary">Batches</h1>
        <p className="mt-1 text-[14px] text-on-surface-variant">
          The batches you&apos;re assigned to.
        </p>
      </header>

      <StudentBatchList batches={batches} />
    </div>
  )
}