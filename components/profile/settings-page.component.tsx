import { createClient } from "@/lib/supabase/server.client"
import SettingsView from "@/components/profile/settings-view.component"
import type { Profile } from "@/types/profile.type"

/**
 * One implementation for admin, student and teacher. The three role
 * settings pages differ only in their URL, so the role is irrelevant
 * here — each account edits its own profile and nothing else.
 */
export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return <SettingsView profile={profile as Profile} />
}
