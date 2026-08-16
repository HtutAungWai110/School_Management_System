import { CircleHelp, Bell } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import { TimetableCreateButton } from "@/components/timetable/timetable-create-button.component"
import { TimetableRow } from "@/components/timetable/timetable-row.component"
import type { Batch } from "@/types/batch.type"
import type { Module } from "@/types/module.type"
import type { Teacher } from "@/types/teacher.type"
import type { Class } from "@/types/class.type"
import type { Timetable } from "@/types/timetable.type"

export default async function TimetablePage() {
  const [timetables, batches, modules, teachersResponse, classes] = await Promise.all([
    serverFetch("http://localhost:3000/api/timetables", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Timetable[]>,
    serverFetch("http://localhost:3000/api/batches", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Batch[]>,
    serverFetch("http://localhost:3000/api/modules_level", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Module[]>,
    serverFetch("http://localhost:3000/api/teachers", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<{ teachers: Teacher[] }>,
    serverFetch("http://localhost:3000/api/classes", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Class[]>,
  ]);

  const teachers = teachersResponse.teachers ?? [];

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Timetable</h1>
            <div className="flex items-center gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <div className="relative">
                <Bell className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Timetable Directory</h2>
              <TimetableCreateButton
                batches={batches ?? []}
                modules={modules ?? []}
                teachers={teachers}
                classes={classes ?? []}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Day", "Batch", "Module", "Teacher", "Class", "Time", ""].map((h) => (
                      <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {(timetables ?? []).map((timetable) => (
                    <TimetableRow key={timetable.id} timetable={timetable} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing {(timetables ?? []).length} sessions
              </p>
            </div>
          </div>
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center px-12 py-6 w-full max-w-[1440px] mx-auto">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">CodePoint Academy</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">© 2024 ScholarlyAdmin School Management System</span>
            </div>
            <div className="flex gap-6">
              {["Help Center", "Privacy Policy", "Terms of Service"].map((link) => (
                <a key={link} href="#" className="text-[12px] font-[500] leading-[16px] text-on-surface-variant hover:text-primary transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
