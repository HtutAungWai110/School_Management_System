import { createClient } from "@/lib/supabase/server.client";
import ProfileStoreSync from "@/components/profile/profile-store-sync.component";

/**
 * This route sits outside the role route groups, so none of the three layouts
 * that mount ProfileStoreSync wrapped it. Without one, a hard load or refresh
 * left the profile store empty, and anything keyed on the signed-in user id —
 * the notification hook among them — silently had no user to read for.
 * Navigating here from a dashboard happened to work only because the previous
 * page's layout had already populated the store.
 */
export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();

  // A fragment, not a <main>: the page already renders one.
  return (
    <>
      <ProfileStoreSync profile={profile} />
      {children}
    </>
  );
}