import { createClient } from "@/lib/supabase/server.client"
import LandingPageContent from "@/components/student/landing-page-content.component"
import { EventAnnouncementsPreview } from "@/components/events/event-announcements-preview.component"
import { serverFetch } from "@/lib/server.service"
import type { EventAnnouncementPage } from "@/types/event-announcement.type"

export default async function TeacherLandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single()

  /* The portal home previews the same feed the announcements page paginates,
     capped at the newest ten posts. */
  const events = (await serverFetch(
    "http://localhost:3000/api/event-announcements?page=1&limit=10",
    { cache: "no-store" }
  )
    .then((response) => response.json())
    .catch(() => null)) as EventAnnouncementPage | null

  return (
    <LandingPageContent
      profileFullName={profile?.full_name ?? null}
      role="teacher"
    >
      <EventAnnouncementsPreview
        announcements={events?.data ?? []}
        href="/teacher/announcements"
      />
    </LandingPageContent>
  )
}
