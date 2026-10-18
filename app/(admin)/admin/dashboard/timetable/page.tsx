import { CircleHelp } from "lucide-react"
import { NotificationBell } from "@/components/notifications/notification-bell.component"

import { serverFetch } from "@/lib/server.service"
import { TimetableCreateButton } from "@/components/timetable/timetable-create-button.component"
import { TimetableRow } from "@/components/timetable/timetable-row.component"
import { PaginationNav } from "@/components/navigation/pagination-nav.component"
import { PageLimitSelector } from "@/components/navigation/page-limit-selector.component"
import FilterButton from "@/components/search/filter-dropdown.component"
import type { Batch } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import type { Timetable } from "@/types/timetable.type"

interface TimetablesData {
  timetables: Timetable[]
  totalCount: number
  totalPages: number
}

interface PageProps {
searchParams: Promise<{ page?: string; limit?: string; batch?: string; id?: string | string[] }>
}

export default async function TimetablePage({ searchParams }: PageProps) {
  const { page, limit, batch, id } = await searchParams;
  const currentPage = page || "1";
  const currentLimit = limit || "10";

  let timetablesUrl = `http://localhost:3000/api/timetables?page=${currentPage}&limit=${currentLimit}`;
  if (batch) {
    timetablesUrl += `&batch=${encodeURIComponent(batch)}`;
  }
  // A swap moves two sessions, so the id may arrive repeated.
  for (const value of Array.isArray(id) ? id : id ? [id] : []) {
    timetablesUrl += `&id=${encodeURIComponent(value)}`;
  }

  const [timetablesData, batches, classes] = await Promise.all([
    serverFetch(timetablesUrl, { next: { revalidate: 120 } }).then(res => res.json()) as Promise<TimetablesData>,
    serverFetch("http://localhost:3000/api/batches", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Batch[]>,
    serverFetch("http://localhost:3000/api/classes", { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Class[]>,
  ]);

  const timetables = timetablesData?.timetables ?? [];
  const totalCount = timetablesData?.totalCount ?? 0;
  const totalPages = timetablesData?.totalPages ?? 0;

  const batchOptions = (batches ?? []).map((b) => ({ value: b.id, label: b.batch_name }));

  return (
    <div className="min-h-screen bg-background flex">
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex flex-col gap-4 px-4 py-4 max-w-[1440px] mx-auto sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-12">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Timetable</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-1">
                <CircleHelp className="w-5 h-5" />
                <span className="text-[14px] font-[600] leading-[16px] tracking-[0.05em]">Help</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <div className="px-4 py-6 max-w-[1440px] mx-auto sm:px-6 sm:py-8 lg:px-12 lg:py-10">
          <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
            <div className="p-6 border-b border-outline-variant/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Timetable Directory</h2>
              <div className="flex items-center gap-5">
                <FilterButton options={batchOptions} label="Batch" paramName="batch" />
                <TimetableCreateButton
                  batches={batches ?? []}
                  classes={classes ?? []}
                />
              </div>
            </div>
            <div className="overflow-x-auto min-h-50">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Day", "Batch", "Module", "Teacher", "Class", "Time", "Status", ""].map((h) => (
                      <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timetables.map((timetable) => (
                    <TimetableRow key={timetable.id} timetable={timetable} classes={classes ?? []} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing {timetables.length} of {totalCount} sessions
              </p>
              <div className="flex items-center gap-4">
                <PageLimitSelector />
                <PaginationNav page={Number(currentPage)} totalPages={totalPages} />
              </div>
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
