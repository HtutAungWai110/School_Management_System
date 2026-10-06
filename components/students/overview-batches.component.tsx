import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import type { BatchStatus } from "@/types/batch.type"
import type { OverviewBatch } from "@/types/student-overview.type"

export default function OverviewBatches({ batches }: { batches: OverviewBatch[] }) {
  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between gap-4 px-6 pt-5">
        <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Your batches</h2>
        <span className="font-mono text-[12px] leading-[16px] tabular-nums text-on-surface-variant">
          {batches.length}
        </span>
      </header>

      {batches.length === 0 ? (
        <p className="px-6 pb-5 pt-2 text-[14px] leading-[22px] text-on-surface-variant">
          You aren&apos;t assigned to a batch yet.
        </p>
      ) : (
        <ul className="mt-3">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="flex items-center justify-between gap-4 border-t border-outline-variant/10 px-6 py-4"
            >
              <span className="min-w-0 truncate text-[15px] font-[500] leading-[22px] text-on-surface">
                {batch.batch_name}
              </span>
              <BatchStatusBadge status={(batch.status as BatchStatus | null) ?? null} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}