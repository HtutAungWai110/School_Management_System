"use client"

import { Calendar } from "lucide-react"

import StudentPortalFooter from "@/components/student/student-portal-footer.component"
import StudentPortalHeader from "@/components/student/student-portal-header.component"

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export default function LandingPageContent({
  profileFullName,
  role = "student",
  children,
}: {
  profileFullName: string | null
  role?: "student" | "teacher" | "admin"
  /** Extra role-specific section rendered under the welcome banner. */
  children?: React.ReactNode
}) {
  const homeHref = `/${role}`
  const dashboardHref = `/${role}/dashboard/overview`
  const fallbackName =
    role === "admin" ? "Admin" : role === "teacher" ? "Teacher" : "Student"

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <StudentPortalHeader
        active="home"
        homeHref={homeHref}
        dashboardHref={dashboardHref}
        showLevels={role === "student"}
      />

      <div className="w-full pt-16 bg-surface min-h-[calc(100vh-140px)]">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-10">
          <div className="flex flex-col w-full">
            <section className="relative w-full rounded-xl bg-surface-container-lowest p-6 md:p-10 shadow-sm overflow-hidden">
              <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-secondary-fixed/40 blur-3xl pointer-events-none" />
              <div className="absolute -left-12 bottom-0 w-64 h-64 rounded-full bg-surface-container-high/60 blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[12px] font-[500] leading-[16px] text-on-surface-variant flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatToday()}
                </span>
                <h1 className="text-[32px] font-[700] leading-[40px] tracking-[-0.02em] text-on-surface mt-1">
                  Welcome back,{" "}
                  <span className="text-primary">
                    {profileFullName ?? fallbackName}
                  </span>
                </h1>
              </div>
            </section>

            {children && <div className="w-full mt-10">{children}</div>}
          </div>
        </div>
      </div>

      <StudentPortalFooter />
    </div>
  )
}
