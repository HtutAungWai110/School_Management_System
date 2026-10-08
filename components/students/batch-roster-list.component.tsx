"use client"

import Image from "next/image"

import { useProfileStore } from "@/components/profile/profile.state"
import type { BatchRosterStudent } from "@/types/student-batch-detail.type"
import { cn } from "@/lib/utils.util"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={40}
        height={40}
        unoptimized
        className="size-10 shrink-0 rounded-full border border-outline-variant/20 object-cover"
      />
    )
  }

  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-dim text-[14px] font-bold text-on-surface-variant">
      {getInitials(name)}
    </span>
  )
}

/**
 * A client boundary for one reason: telling the viewer which row is their own.
 * The profile id lives in a Zustand store, so the roster cannot be rendered on
 * the server without shipping that store to the client anyway. The batch header
 * and module coverage above this stay server-rendered.
 */
export default function BatchRosterList({ students }: { students: BatchRosterStudent[] }) {
  const studentId = useProfileStore((state) => state.profile.id)

  return (
    <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/70">
      <h2 className="px-5 py-4 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
        Students
      </h2>

      {students.length === 0 ? (
        <p className="border-t border-outline-variant/15 px-5 py-12 text-center text-[14px] leading-5 text-on-surface-variant">
          No students assigned to this batch yet.
        </p>
      ) : (
        <ul className="border-t border-outline-variant/15">
          {students.map((student) => {
            const isMe = Boolean(studentId) && student.id === studentId

            return (
              <li
                key={student.id}
                className={cn(
                  "flex items-start gap-3 border-b border-outline-variant/15 px-5 py-3.5 last:border-b-0",
                  isMe && "bg-brand-soft/50"
                )}
              >
                <Avatar name={student.full_name} url={student.avatar_url} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-[600] leading-[20px] text-on-surface">
                    {student.full_name}
                    {isMe && (
                      <span className="ml-1.5 font-[500] text-primary">(Me)</span>
                    )}
                  </p>
                  <p className="truncate text-[13px] leading-[18px] text-on-surface-variant">
                    {student.email}
                  </p>

                  {/* Chip design matches the admin batch students panel: code
                      plus title, tinted, sitting under the name. */}
                  {(student.student_enrollments ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(student.student_enrollments ?? []).map((enrollment, index) =>
                        enrollment.modules ? (
                          <span
                            key={`${student.id}-${enrollment.modules.code}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-secondary-container/60 bg-primary-fixed/50 px-2 py-0.5 text-[11px] font-[600] leading-[14px] text-on-surface"
                          >
                            {enrollment.modules.code}
                            <span className="font-[500] text-on-surface-variant">
                              {enrollment.modules.title}
                            </span>
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}