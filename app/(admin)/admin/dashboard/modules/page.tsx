import { Search, CircleHelp, Bell, BookOpen, Filter, Plus } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import type { Module } from "@/types/module.type"

const requiredBadgeClass: Record<string, string> = {
  core: "bg-primary-fixed/50 text-on-primary-fixed-variant border-primary/20",
  elective: "bg-secondary-container/30 text-secondary border-secondary-container",
  mandatory: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border-tertiary/20",
  specialist: "bg-surface-container text-on-surface-variant border-outline-variant/30",
}

export default async function ModulesPage() {

  const modules = await serverFetch(`http://localhost:3000/api/modules`, { next: { revalidate: 120 } }).then(res => res.json()) as Module[]

  console.log(modules[0])
  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Modules</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/10">
                <Search className="w-5 h-5 text-on-surface-variant mr-2" />
                <input
                  className="bg-transparent border-none focus:outline-none text-[14px] leading-[20px] text-on-surface placeholder:text-on-surface-variant w-48"
                  placeholder="Search modules..."
                  type="text"
                />
              </div>
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
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Module Catalogue</h2>
              <div className="flex gap-4">
                <button className="text-on-surface-variant hover:text-primary flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] transition-colors">
                  <Filter className="w-5 h-5" />
                  Filters
                </button>
                <button className="bg-primary text-on-primary px-6 py-2 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors duration-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Module
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Code", "Title", "Levels", ""].map((h) => (
                      <th key={h} className={`px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider ${h === "" ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {modules.map((module) => (
                    <tr key={module.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-fixed/30 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-on-primary-fixed-variant" />
                          </div>
                          <span className="text-[14px] font-[600] leading-[20px] text-on-surface">{module.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[16px] leading-[24px] font-bold text-on-surface">{module.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {module.modules_level.map((ml) => (
                            <span
                              key={ml.levels.id}
                              className={`px-2.5 py-0.5 rounded-full border text-[12px] font-[500] leading-[16px] ${requiredBadgeClass[ml.required] ?? "bg-surface-container text-on-surface-variant border-outline-variant/30"}`}
                            >
                              {ml.levels.description} · {ml.required}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-primary hover:text-secondary transition-colors">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing {modules.length} modules
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
