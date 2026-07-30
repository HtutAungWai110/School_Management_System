import Image from "next/image"
import { MetricCard } from "../metric-card"
import { Search, CircleHelp, Bell, User, UserPlus, ClipboardCheck, Filter, Plus, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react"

import { serverFetch } from "@/lib/server.fetch"

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
}

export default async function StudentsPage() {
  const data = await serverFetch("http://localhost:3000/api/school/students").then(res => res.json())

  const students = data?.students ?? []
  const totalCount = data?.totalCount ?? 0
  const newEnrollments = data?.newEnrollments ?? 0

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Students</h1>
            <div className="flex items-center gap-6">
              <div className="flex items-center bg-surface-container-low px-4 py-2 rounded-lg border border-outline-variant/10">
                <Search className="w-5 h-5 text-on-surface-variant mr-2" />
                <input
                  className="bg-transparent border-none focus:outline-none text-[14px] leading-[20px] text-on-surface placeholder:text-on-surface-variant w-48"
                  placeholder="Search students..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              icon={User}
              label="Active Students"
              value={totalCount}
              badge="+12%"
              badgeClass="text-green-600 bg-green-50"
              iconBg="bg-secondary-container/50"
              iconColor="text-secondary"
              subtitle="Enrolled"
            />
            <MetricCard
              icon={UserPlus}
              label="New Enrollments"
              value={newEnrollments}
              badge="Last 30 days"
              badgeClass="text-on-surface-variant bg-surface-container"
              iconBg="bg-tertiary-fixed/30"
              iconColor="text-on-tertiary-fixed-variant"
              subtitle=""
            />
            <MetricCard
              icon={ClipboardCheck}
              label="Avg. Attendance"
              value="94.2%"
              badge="Stable"
              badgeClass="text-on-primary-fixed-variant bg-primary-fixed/50"
              iconBg="bg-primary-fixed/30"
              iconColor="text-on-primary-fixed-variant"
              subtitle=""
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Student Directory</h2>
              <div className="flex gap-4">
                <button className="text-on-surface-variant hover:text-primary flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] transition-colors">
                  <Filter className="w-5 h-5" />
                  Filters
                </button>
                <button className="bg-primary text-on-primary px-6 py-2 rounded text-[14px] font-[600] leading-[16px] tracking-[0.05em] hover:bg-secondary transition-colors duration-200 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Student
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Student", "Email", "Role", "Joined Date", ""].map((h) => (
                      <th key={h} className={`px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider ${h === "" ? "text-right" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {students.map((student: { id: string; full_name: string; email: string; avatar_url: string | null; created_at: string }) => (
                    <tr key={student.id} className="hover:bg-surface-container-low transition-colors group">
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
                            <p className="text-[14px] leading-[20px] text-on-surface-variant">ID: {student.id.slice(0, 4).toUpperCase()}-{student.id.slice(4, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">{student.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/30 text-secondary border border-secondary-container text-[12px] font-[500] leading-[16px]">Student</span>
                      </td>
                      <td className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
                        {new Date(student.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <MoreVertical className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors inline-block" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing 1-{students.length} of {totalCount} students
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 border border-outline-variant/30 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50" disabled>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-4 py-2 bg-primary text-on-primary rounded text-[12px] font-[500] leading-[16px]">1</button>
                <button className="px-4 py-2 hover:bg-surface-container-low rounded text-[12px] font-[500] leading-[16px] transition-colors text-on-surface-variant">2</button>
                <button className="px-4 py-2 hover:bg-surface-container-low rounded text-[12px] font-[500] leading-[16px] transition-colors text-on-surface-variant">3</button>
                <button className="p-2 border border-outline-variant/30 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
