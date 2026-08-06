import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { EnrolledStudent } from "@/types/enrollment.type";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function EnrollmentRow({ student }: { student: EnrolledStudent }) {
  const enrollments = student.student_enrollments ?? [];

  return (
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-container/30 text-secondary border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
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
    </tr>
  );
}
