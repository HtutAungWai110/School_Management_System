"use client"

import { BookOpen } from "lucide-react"
import type { TeacherModuleRow } from "@/types/teacher-module.type"

export function TeacherModuleRowComponent({ module }: { module: TeacherModuleRow }) {
  return (
    <tr className="border-b border-primary/10 hover:bg-surface-container-low transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-on-primary-fixed-variant" />
          </div>
          <span className="text-[14px] font-[600] leading-[20px] text-on-surface">{module.modules.code}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <p className="text-[16px] leading-[24px] font-bold text-on-surface">{module.modules.title}</p>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-wrap gap-2">
          {module.modules.levels.map((level) => (
            <span key={level.id} className="text-[12px] font-[500] leading-[16px] px-2 py-1 rounded bg-primary-fixed/10 text-primary">
              {level.description}
            </span>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
          {new Date(module.assigned_at).toLocaleDateString()}
        </span>
      </td>
    </tr>
  )
}
