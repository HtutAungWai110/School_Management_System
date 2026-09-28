import LevelsCatalog from "@/components/levels/levels-catalog.component"
import StudentPortalHeader from "@/components/student/student-portal-header.component"
import StudentPortalFooter from "@/components/student/student-portal-footer.component"
import type { Level } from "@/types/module.type"

async function getLevels(): Promise<Level[]> {
  const res = await fetch("/api/levels", { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch levels")
  }
  return res.json()
}

export default async function LevelsPage() {
  const levels = await getLevels()

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