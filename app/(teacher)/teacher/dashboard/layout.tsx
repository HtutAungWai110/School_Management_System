import TeacherSidebar from "@/components/teachers/teacher-sidebar.component"

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <TeacherSidebar />
      {children}
    </>
  )
}
