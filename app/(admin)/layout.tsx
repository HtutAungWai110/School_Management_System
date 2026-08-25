import { createClient } from "@/lib/supabase/server.client";
import ProfileStoreSync from "@/components/profile/profile-store-sync.component";
import Sidebar from "@/components/admin/admin-sidebar.component";
import { RouteProgress } from "@/components/navigation/route-progress.component";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
  }) {

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user?.id).single();

  console.log(user)

  return (
    <main>
      <RouteProgress />
      <ProfileStoreSync profile={profile} />
      <Sidebar/>
      {children}
    </main>
  )
}
