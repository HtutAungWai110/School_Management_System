import { createClient } from "@/lib/supabase/server.client"
import LandingPageContent from "@/components/student/landing-page-content.component"
import { EventAnnouncementsPreview } from "@/components/events/event-announcements-preview.component"
import { serverFetch } from "@/lib/server.service"
import type { EventAnnouncementPage } from "@/types/event-announcement.type"

export default async function AdminLandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single()

  /* The portal home previews the same paginated feed the /admin/announcements page
     uses, just capped at the newest ten posts. */
  const events = (await serverFetch(
    "http://localhost:3000/api/event-announcements?page=1&limit=10",
    { cache: "no-store" }
  )
    .then((response) => response.json())
    .catch(() => null)) as EventAnnouncementPage | null

  return (
    <LandingPageContent
      profileFullName={profile?.full_name ?? null}
      role="admin"
    >
      <EventAnnouncementsPreview announcements={events?.data ?? []} />
    </LandingPageContent>
  )
}
