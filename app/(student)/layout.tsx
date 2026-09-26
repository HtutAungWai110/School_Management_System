import { createClient } from "@/lib/supabase/server.client"
import ProfileStoreSync from "@/components/profile/profile-store-sync.component"
import { AccountCompletionReminder } from "@/components/profile/account-completion-reminder.component"
import { RouteProgress } from "@/components/navigation/route-progress.component"

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
      {children}
    </main>
  )
}
