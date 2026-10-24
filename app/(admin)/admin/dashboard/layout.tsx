import Sidebar from "@/components/admin/admin-sidebar.component"

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Sidebar />
      {children}
    </>
  )
}
