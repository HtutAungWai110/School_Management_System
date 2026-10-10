import { buildModuleCoverage } from "@/lib/batch-coverage.util"

/**
 * How many of the batch are on each module. Every bar is scaled to the same
 * denominator, the cohort size, so a short bar is visibly a gap rather than a
 * different scale. Shared by the student and admin batch pages.
 */
export default function BatchModuleCoverage({
  enrolments,
  cohortSize,
}: {
  enrolments: Array<{ modules: { code: string; title: string } | null }>
  cohortSize: number
}) {
  const coverage = buildModuleCoverage(enrolments)

  return (
    <section className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70 p-5">
      <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
        Module coverage
      </h2>
      <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
        How many of the batch are on each module.
      </p>

      {coverage.length === 0 ? (
        <p className="mt-4 text-[13px] leading-5 text-on-surface-variant">
          No enrolments recorded for this batch yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {coverage.map((module) => (
            <li key={module.code}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[12px] font-medium leading-4 text-on-surface">
                  {module.code}
                </span>
                <span className="font-mono text-[11px] leading-4 tabular-nums text-on-surface-variant">
                  {module.count} of {cohortSize}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: cohortSize > 0 ? `${(module.count / cohortSize) * 100}%` : "0%",
                  }}
                />
              </div>
              {module.title && (
                <p className="mt-1 truncate text-[12px] leading-4 text-on-surface-variant">
                  {module.title}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}