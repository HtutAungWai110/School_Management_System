import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export default async function ProfileCard()
{
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', user?.id)
      .single();
  console.log(profile)
  if (!user) return null;
  return (
    <div>

    </div>
  );
}
