import { createClient } from "@/lib/supabase/server.client"
import ProfileStoreSync from "@/components/profile/profile-store-sync.component"
import { AccountCompletionReminder } from "@/components/profile/account-completion-reminder.component"
import { RouteProgress } from "@/components/navigation/route-progress.component"
import { NotificationBell } from "@/components/notifications/notification-bell.component"

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  return (
    <main>
      <RouteProgress />
      <ProfileStoreSync profile={profile} />
      <AccountCompletionReminder settingsHref="/student/dashboard/settings" />

      {/* Student pages have no header bar to sit in, so the bell is mounted
          here instead of in each page. That also means one Realtime
          subscription for the whole area and toasts that survive navigation,
          rather than the per-page mount the admin and teacher headers use. */}
      <div className="fixed right-4 top-4 z-40">
        <NotificationBell />
      </div>

      {children}
    </main>
  )
}
