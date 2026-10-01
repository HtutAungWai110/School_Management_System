import { serverFetch } from "@/lib/server.service"
import StudentPortalHeader from "@/components/student/student-portal-header.component"
import StudentSidebar from "@/components/students/student-sidebar.component"
import EnrollmentsEmptyState from "@/components/students/enrollments-empty-state.component"

interface EnrollmentsResponse {
  // The API returns null rather than [] when there are no rows.
  enrollments: { id: string }[] | null
}

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { enrollments } = (await serverFetch(
    `http://localhost:3000/api/student/enrollments`,
    // Cookie-scoped per student. Must never be cached, or one student's
    // enrolments could be served to the next.
    { cache: "no-store" }
  ).then((res) => res.json())) as EnrollmentsResponse

  const hasEnrollments = Array.isArray(enrollments) && enrollments.length > 0

  return (
    <div className="min-h-screen bg-surface text-foreground">
      {hasEnrollments ? (
        <div className="lg:pl-64">
          <StudentSidebar />
          {children}
        </div>
      ) : (
        <div className="pt-16">
          <StudentPortalHeader active="home" />
          <EnrollmentsEmptyState />
        </div>
      )}
    </div>
  )
}
