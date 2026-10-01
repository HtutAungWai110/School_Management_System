import Link from "next/link"
import { Compass } from "lucide-react"

/**
 * Shown instead of the dashboard while a student has no enrolments —
 * there is nothing to summarise until they pick a course. Routes to the
 * catalogue rather than leaving a dead end.
 */
export default function EnrollmentsEmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-md  p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-container text-primary">
          <Compass className="size-6" />
        </span>

        <h1 className="mt-5 text-[20px] font-bold leading-7 tracking-tight text-foreground">
          You haven&apos;t enrolled to any course yet
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-on-surface-variant">
          Pick a qualification from the catalogue to see your timetable, assignments and
          attendance. An administrator approves each enrolment.
        </p>

        <Link
          href="/student/levels"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Explore courses
        </Link>
      </div>
    </div>
  )
}
