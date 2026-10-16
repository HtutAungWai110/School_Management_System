import { MetricCard } from "@/components/admin/metric-card.component"
import { EnrollmentDirectory } from "@/components/enrollments/enrollment-directory.component"
import { CircleHelp, Users, BookOpenCheck, Layers } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell.component"
import SearchBar from "@/components/search/searchbar.component"
import FilterButton from "@/components/search/filter-dropdown.component"

import { serverFetch } from "@/lib/server.service"
import type { EnrollmentsResponse } from "@/types/enrollment.type"
import type { Level } from "@/types/module.type"

interface PageProps {
  searchParams: Promise<{ page?: string, search?: string, filter?: string, id?: string }>
}

export default async function EnrollmentsPage({ searchParams }: PageProps) {
  const { page, search, filter, id } = await searchParams;
  const currentPage = page || 1;

  let url = `http://localhost:3000/api/enrollments?page=${currentPage}`
  if (search) {
    url += `&search=${encodeURIComponent(search)}`
  }
  if (filter) {
    url += `&filter=${encodeURIComponent(filter)}`
  }
  if (id) {
    url += `&id=${encodeURIComponent(id)}`
  }

  const [response, levels] = await Promise.all([
    serverFetch(url, { next: { revalidate: 120 } }),
    serverFetch(`http://localhost:3000/api/levels`, { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Level[]>,
  ])

  /* Checked rather than assumed: a failed request used to fall through to
     `data?.enrollments ?? []` and render as an empty queue, which reads as
     "this student has nothing pending" when it actually means the lookup
     failed. */
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { error?: string } | null

    return (
      <div className="min-h-screen bg-background flex">
        <main className="flex-1 lg:ml-64">
          <div className="px-12 py-10 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Enrollments</h1>
            <div className="mt-6 rounded-xl border border-destructive/25 bg-destructive/10 px-6 py-12 text-center">
              <p className="text-[14px] leading-5 text-destructive">
                {error?.error ?? "We couldn't load these enrolments."}
              </p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const data = (await response.json()) as EnrollmentsResponse
  const enrollments = data?.enrollments ?? []
  const totalCount = data?.totalCount ?? 0
  const totalEnrollments = data?.totalEnrollments ?? 0
  const totalPages = data?.totalPages ?? 0

  const activeLevels = new Set(enrollments.map((entry) => entry.student_enrollments[0]?.level_id).filter(Boolean)).size
  const levelOptions = (levels ?? []).map((level) => ({ label: level.description, value: level.id }))

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-5">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Enrollments</h1>
            <div className="flex items-center gap-6">
              <SearchBar placeholder="Search students..." />
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <MetricCard
              icon={Users}
              label="Enrolled Students"
              value={totalCount}
              badge="Active"
              subtitle="Students"
            />
            <MetricCard
              icon={BookOpenCheck}
              label="Module Enrollments"
              value={totalEnrollments}
              badge="All time"
              subtitle="Registrations"
            />
            <MetricCard
              icon={Layers}
              label="Active Levels"
              value={activeLevels}
              badge="In use"
              subtitle="Diplomas"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Enrollment Directory</h2>
              <div className="flex items-center gap-4">
                <FilterButton options={levelOptions} label="Level" />
                <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">{totalEnrollments} module registrations</span>
              </div>
            </div>
            <EnrollmentDirectory
              students={enrollments}
              totalCount={totalCount}
              page={Number(currentPage)}
              totalPages={Number(totalPages)}
            />
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
