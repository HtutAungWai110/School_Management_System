import { AssignmentsPanel } from "@/components/assignments/assignments-panel.component"

export default async function TeacherAssignmentsPage() {
  return (
    <div className="min-h-screen bg-background flex">
      <main className="flex-1 lg:ml-64">
        <header className="bg-background sticky top-0 z-10 w-full border-b border-outline-variant/10">
          <div className="flex justify-between items-center px-12 py-4 max-w-[1440px] mx-5">
            <h1 className="text-[24px] font-[600] leading-[32px] text-primary">Assignments</h1>
          </div>
        </header>

        <div className="px-12 py-10 max-w-[1440px] mx-auto">
          <AssignmentsPanel
            endpoint="/api/teacher/assignments"
            subtitle="Work your students have turned in, across every batch you teach."
          />
        </div>
      </main>
    </div>
  )
}