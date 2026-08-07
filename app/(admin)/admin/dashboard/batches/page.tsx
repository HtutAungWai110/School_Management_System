import { CircleHelp, Bell } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import { BatchesRow } from "@/components/batches/batches-row.component"
import { BatchesCreateButton } from "@/components/batches/batches-create-button.component"
import type { Batch } from "@/types/batch.type"
import type { Level } from "@/types/module.type"

export default async function BatchesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams;

  let url = "http://localhost:3000/api/batches"

  if (search) {
    url += `?search=${encodeURIComponent(search)}`;
  }

  const [batches, levels] = await Promise.all([
    serverFetch(url, { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Batch[]>,
    serverFetch(`http://localhost:3000/api/levels`, { next: { revalidate: 120 } }).then(res => res.json()) as Promise<Level[]>,
  ]);

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-auto">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Batches</h1>
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
              <h2 className="text-[20px] font-[600] leading-[28px] text-primary">Batch Directory</h2>
              <BatchesCreateButton levels={levels ?? []} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low">
                  <tr>
                    {["Batch", "Levels", "Students", "Created", ""].map((h) => (
                      <th key={h} className="px-6 py-3 text-[12px] font-[500] leading-[16px] text-on-surface-variant uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {batches.map((batch) => (
                    <BatchesRow key={batch.id} batch={batch} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/20">
              <p className="text-[12px] font-[500] leading-[16px] text-on-surface-variant">
                Showing {batches.length} batches
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
