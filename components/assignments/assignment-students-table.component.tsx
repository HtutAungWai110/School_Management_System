"use client"

import { FileText } from "lucide-react"
import { cn } from "@/lib/utils.util"
import type { AssignmentStudent } from "@/types/batch.type"

const nameW = "w-[24%]"
const emailW = "w-[26%]"
const phoneW = "w-[18%]"
const fileW = "w-[14%]"
const turnedInW = "w-[18%]"

function formatTurnedIn(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AssignmentStudentsTable({
  students,
}: {
  students: AssignmentStudent[]
}) {
  const sorted = [...students].sort((a, b) =>
    (a.profiles?.full_name ?? "").localeCompare(b.profiles?.full_name ?? "")
  )

  return (
    <div className="pl-12 pr-5 pb-3">
      <div className="overflow-x-auto border border-outline-variant/10 rounded-lg">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/10 bg-surface-container-low/50">
              <th className={cn(nameW, "px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider")}>
                Full Name
              </th>
              <th className={cn(emailW, "px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider")}>
                Email
              </th>
              <th className={cn(phoneW, "px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider")}>
                Phone
              </th>
              <th className={cn(fileW, "px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider")}>
                File
              </th>
              <th className={cn(turnedInW, "px-4 py-2 text-[11px] font-[600] leading-[14px] text-on-surface-variant uppercase tracking-wider")}>
                Turned In
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((student, i) => (
              <tr
                key={student.id}
                className={cn(
                  "border-b border-outline-variant/5 last:border-b-0",
                  i % 2 === 0 ? "bg-transparent" : "bg-surface-container-low/10"
                )}
              >
                <td className="px-4 py-2 text-[13px] font-[500] leading-[18px] text-on-surface truncate">
                  {student.profiles?.full_name ?? "Unknown"}
                </td>
                <td className="px-4 py-2 text-[13px] leading-[18px] text-on-surface-variant truncate">
                  {student.profiles?.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-[13px] leading-[18px] text-on-surface-variant truncate">
                  {student.profiles?.phone ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex max-w-full items-center gap-1.5 text-[13px] leading-[18px] text-on-surface">
                    <FileText className="size-3.5 shrink-0 text-on-surface-variant" />
                    <span className="truncate">{student.file_name || "—"}</span>
                  </span>
                </td>
                <td className="px-4 py-2 text-[13px] leading-[18px] text-on-surface-variant truncate">
                  {formatTurnedIn(student.turned_in_at)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-[13px] leading-[18px] text-on-surface-variant"
                >
                  No submissions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}