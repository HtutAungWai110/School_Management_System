"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image";
import { BookOpen, MoreVertical, Users, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils.util"
import type { EnrolledStudent } from "@/types/enrollment.type";
import { EnrollmentBatchPanel } from "./enrollment-batch-panel.component"
import { EnrollmentDeletePanel } from "./enrollment-delete-panel.component"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function EnrollmentRow({ student }: { student: EnrolledStudent }) {
  const enrollments = student.student_enrollments ?? [];

  const [menuOpen, setMenuOpen] = useState(false)
  const [batchOpen, setBatchOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [menuOpen])

  return (
    <>
      <tr className="hover:bg-surface-container-low transition-colors">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {student.avatar_url ? (
              <Image
                className="w-10 h-10 rounded-full object-cover border border-outline-variant/20"
                src={student.avatar_url}
                alt={student.full_name}
                width={40}
                height={40}
                unoptimized
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-dim flex items-center justify-center font-bold text-on-surface-variant text-sm">
                {getInitials(student.full_name)}
              </div>
            )}
            <div>
              <p className="text-[16px] leading-[24px] font-bold text-on-surface">{student.full_name}</p>
              <p className="text-[14px] leading-[20px] text-on-surface-variant">{student.email}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {enrollments.length === 0 ? (
              <span className="text-[14px] leading-[20px] text-on-surface-variant">No active enrollments</span>
            ) : (
              enrollments.map((enrollment) => (
                <span
                  key={enrollment.id}
                  className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="font-[700]">{enrollment.modules.code}</span>
                  {enrollment.modules.title}
                </span>
              ))
            )}
          </div>
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {enrollments[0]?.levels.description ?? "—"}
        </td>
        <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {enrollments[0] ? formatDate(enrollments[0].enrolled_at) : "—"}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block" ref={menuRef}>
            <button
              type="button"
              aria-label="Enrollment actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 min-w-[170px] rounded-lg border border-outline-variant/20 bg-surface-container-lowest shadow-lg py-1">
                {[
                  {
                    label: "Add to batch",
                    icon: Users,
                    className: "text-on-surface",
                    iconClassName: "text-on-surface-variant",
                    onClick: () => {
                      setMenuOpen(false)
                      setBatchOpen(true)
                    },
                  },
                  {
                    label: "Delete",
                    icon: Trash2,
                    className: "text-destructive hover:bg-destructive/10",
                    iconClassName: "text-destructive",
                    onClick: () => {
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    },
                  },
                ].map(({ label, icon: Icon, className, iconClassName, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className={cn(
                      "w-full flex items-center gap-2 px-4 py-2 text-left text-[14px] leading-[20px] hover:bg-surface-container transition-colors",
                      className
                    )}
                  >
                    <Icon className={cn("w-4 h-4", iconClassName)} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
      {batchOpen && <EnrollmentBatchPanel student={student} onClose={() => setBatchOpen(false)} />}
      {deleteOpen && <EnrollmentDeletePanel student={student} onClose={() => setDeleteOpen(false)} />}
    </>
  );
}
