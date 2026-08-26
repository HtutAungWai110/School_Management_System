import Link from "next/link"
import { ArrowLeft, Bell, BookX, Calendar, CircleHelp, Users } from "lucide-react"

import { serverFetch } from "@/lib/server.service"
import type { Batch, BatchModule } from "@/types/batch.type"
import type { Class } from "@/types/class.type"
import { BatchAttendancePanel } from "@/components/batches/batch-attendance-panel.component"
import { BatchStatusBadge } from "@/components/batches/batch-status-badge.component"
import { BatchStudentsPanel } from "@/components/batches/batch-students-panel.component"
import { BatchTimetable } from "@/components/batches/batch-timetable.component"

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [batchRes, classesRes, batchModulesRes] = await Promise.all([
    serverFetch(`http://localhost:3000/api/batches/${id}`, { next: { revalidate: 120 } }),
    serverFetch("http://localhost:3000/api/classes", { next: { revalidate: 120 } }),
    serverFetch(`http://localhost:3000/api/batches/${id}/batch_modules`, { next: { revalidate: 120 } }),
  ]);
  const json = await batchRes.json();
  const batch = json?.data as Batch | null;
  const classes = (await classesRes.json()) as Class[];
  const batchModules = ((await batchModulesRes.json()) ?? []) as BatchModule[];

  const levels = batch?.batch_level ?? [];
  const students = batch?.batch_assignments ?? [];

  const scheduledModuleIds = new Set(
    (batch?.timetables ?? []).map((session) => session.modules?.id).filter(Boolean) as string[]
  );
  const unscheduledModules = batchModules.filter((module) => !scheduledModuleIds.has(module.id));

  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-5">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Batch Details</h1>
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
          <Link
            href="/admin/dashboard/batches"
            className="inline-flex items-center gap-2 text-[14px] font-[600] leading-[16px] tracking-[0.05em] text-on-surface-variant hover:text-primary transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </Link>

          {!batch ? (
            <div className="mt-8 rounded-xl border border-dashed bg-tertiary-fixed px-6 py-16 text-center">
              <Users className="mx-auto size-8 text-on-surface-variant" />
              <p className="mt-4 text-[18px] font-[600] leading-[24px] text-on-surface">Batch not found</p>
              <p className="mt-1 text-[14px] leading-[20px] text-on-surface-variant">
                This batch may have been deleted or never existed.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BatchTimetable
                batch={batch}
                timetables={batch.timetables ?? []}
                classes={classes ?? []}
              />

              <div className="lg:col-span-1 space-y-6">
                <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-on-primary-fixed-variant" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Batch name
                      </p>
                      <div className="mt-1 flex items-center gap-3">
                        <h2 className="truncate text-[20px] font-[700] leading-[28px] text-on-surface">
                          {batch.batch_name}
                        </h2>
                        <BatchStatusBadge status={batch.status ?? null} />
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center gap-2 text-on-surface-variant">
                    <Calendar className="w-4 h-4" />
                    <span className="text-[13px] font-[500] leading-[18px]">
                      Created {formatDate(batch.created_at)}
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 border-b border-outline-variant/10">
                    <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Levels</h3>
                    <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                      The levels covered by this batch.
                    </p>
                  </div>
                  <div className="p-6">
                    {levels.length === 0 ? (
                      <p className="text-[14px] leading-[20px] text-on-surface-variant">No levels assigned</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {levels.map((bl) => (
                          <span
                            key={bl.id}
                            className="text-on-background/10 bg-primary-fixed/50 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-secondary-container/60 text-[12px] font-[600] leading-[16px]"
                          >
                            {bl.levels.description}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-surface-container-lowest rounded-xl border border-primary/10 overflow-hidden shadow-[0_4px_6px_-1px_rgba(15,23,42,0.05)]">
                  <div className="p-6 border-b border-outline-variant/10">
                    <div className="flex items-center gap-2">
                      <BookX className="size-4 text-on-surface-variant" />
                      <h3 className="text-[16px] font-[600] leading-[24px] text-on-surface">Unscheduled modules</h3>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                      {unscheduledModules.length} of {batchModules.length} modules picked by
                      students {unscheduledModules.length === 1 ? "has" : "have"} no timetable slot yet.
                    </p>
                  </div>
                  <div className="p-6">
                    {unscheduledModules.length === 0 ? (
                      <p className="text-[14px] leading-[20px] text-on-surface-variant">
                        All picked modules are scheduled.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {unscheduledModules.map((module) => (
                          <span
                            key={module.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-2.5 py-1 text-[12px] font-[600] leading-[16px]"
                          >
                            <span className="font-bold text-on-surface">{module.code}</span>
                            <span className="text-on-surface-variant">{module.title}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <BatchStudentsPanel batchId={id} students={students} />
              </div>

              <div className="mt-6">
                <BatchAttendancePanel batchId={id} />
              </div>
            </>
          )}
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
