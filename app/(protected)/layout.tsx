import { createClient } from "@/lib/supabase/server";
import ProfileStoreSync from "@/components/ProfileStoreSync";
import Sidebar from "./sidebar";

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
      <ProfileStoreSync profile={profile} />
      <Sidebar/>
      {children}
    </main>
  )
}
