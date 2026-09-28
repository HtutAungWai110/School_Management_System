import { createClient } from "@/lib/supabase/server.client"
import LandingPageContent from "@/components/student/landing-page-content.component"

export default async function StudentLandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single()

  return <LandingPageContent profileFullName={profile?.full_name ?? null} />
}