import { MetricCard } from "@/components/admin/metric-card.component"
import { PaginationNav } from "@/components/navigation/pagination-nav.component"
import { ProfileTemplate } from "@/components/profile/profile-template.component"
import { CircleHelp, User, UserPlus, ClipboardCheck, Plus } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell.component"
import SearchBar from "@/components/search/searchbar.component"
import FilterButton from "@/components/search/filter-dropdown.component"


import { serverFetch } from "@/lib/server.service"
import type { Profile } from "@/types/profile.type"

interface PageProps {
  searchParams: Promise<{page?: string, search?: string, filter?: string, id?: string}>
}

interface StudentsData {
  students: Profile[]
  totalCount: number
  newEnrollments: number
  totalPages: number
}

export default async function StudentsPage({ searchParams }: PageProps) {

  const { page, search, filter, id } = await searchParams;

  const currentPage = page || 1;

  const data = await serverFetch(`http://localhost:3000/api/students?page=${currentPage}${search ? `&search=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${encodeURIComponent(filter)}` : ""}${id ? `&id=${encodeURIComponent(id)}` : ""}`, {next: {revalidate: 120}}).then(res => res.json()) as StudentsData


  const students = data?.students ?? []
  const totalCount = data?.totalCount ?? 0
  const newEnrollments = data?.newEnrollments ?? 0
  const totalPages = data?.totalPages ?? 0

  const percentIncrease = Math.trunc((newEnrollments / totalCount) * 100)




  console.log(data)

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-4 sm:mx-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Students</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">

              <SearchBar placeholder="Search students..." />
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              icon={User}
              label="Active Students"
              value={totalCount}
              badge={"+" + percentIncrease.toString() + "%" }
              subtitle="Enrolled"
            />
            <MetricCard
              icon={UserPlus}
              label="New Enrollments"
              value={newEnrollments}
              badge="Last 30 days"
              subtitle=""
            />
            <MetricCard
              icon={ClipboardCheck}
              label="Avg. Attendance"
              value="94.2%"
              badge="Stable"
              subtitle=""
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Student Directory</h2>
              <div className="flex gap-4 items-center">
                <FilterButton options={[{ label: "New this month", value: "recent" }]} />
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
                <tbody>
                  {students.map((student: Profile) => (
                    <ProfileTemplate key={student.id} profile={student} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing 1-{students.length} of {totalCount} students
              </p>
              <PaginationNav page={Number(currentPage)} totalPages={Number(totalPages)} />
            </div>
          </div>
        </div>

        <footer className="bg-surface-container-lowest border-t border-outline-variant/10 mt-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 py-6 sm:px-6 lg:px-12 w-full max-w-[1440px] mx-auto">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4 md:mb-0">
              <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface">CodePoint Academy</span>
              <span className="text-[12px] font-[500] leading-[16px] text-secondary">© 2024 ScholarlyAdmin School Management System</span>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
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
