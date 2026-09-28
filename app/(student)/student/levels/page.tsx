import { serverFetch } from "@/lib/server.service"
import LevelsCatalog from "@/components/levels/levels-catalog.component"
import StudentPortalHeader from "@/components/student/student-portal-header.component"
import StudentPortalFooter from "@/components/student/student-portal-footer.component"
import type { Level } from "@/types/module.type"

export default async function LevelsPage() {
  const levels = (await serverFetch(
    `http://localhost:3000/api/levels`,
    { next: { revalidate: 120 } }
  ).then((res) => res.json())) as Level[]

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <StudentPortalHeader active="levels" />

      <div className="w-full pt-16 bg-surface min-h-[calc(100vh-140px)]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-10">
          <LevelsCatalog initialLevels={levels} />
        </div>
      </div>

      <StudentPortalFooter />
    </div>
  )
}