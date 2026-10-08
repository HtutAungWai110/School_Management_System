import Link from "next/link"

import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import type { StudentBatch } from "@/types/student-batch.type"
import {Layers} from "lucide-react"

function formatDate(value: string) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
}

export default function StudentBatchList({ batches }: { batches: StudentBatch[] }) {
  if (batches.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 px-6 py-14 text-center">
        <p className="text-[14px] font-medium leading-5 text-on-surface">
          You aren&apos;t in a batch yet
        </p>
        <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
          Your academy assigns you to a batch once your enrolment is confirmed.
        </p>
      </div>
    )
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      {batches.map((batch) => (
        <li
          key={batch.id}
          className="flex flex-col gap-2 border-b border-outline-variant/15 px-5 py-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
        >
          <div className="min-w-0">
            <Link
              href={`/student/dashboard/batches/${batch.id}`}
              className="text-[17px] font-semibold leading-6 text-primary transition-colors hover:text-primary/80"
            >
              {batch.batch_name}
            </Link>

            {batch.levels.length > 0 && (
              <ul className="ml-2 mt-1">
                {batch.levels.map((item, index) =>
                  <li className="flex items-center gap-2 text-[0.8em]" key={index}><Layers size={15}/> {item}</li>
                )}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
            <BatchStatusBadge status={batch.status} />
            <p className="font-mono text-[11px] leading-4 text-on-surface-variant">
              Created {formatDate(batch.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
