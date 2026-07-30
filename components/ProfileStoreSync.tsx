"use client"

import { useProfileStore } from "@/states/profile.state";
import type { Profile } from "@/types/profile.type";
import { useEffect } from "react";


export default function ProfileStoreSync({profile}: {profile: Profile}) {
  const { setProfile } = useProfileStore();

  useEffect(() => {
    if (profile) {
      setProfile(profile);
    }
  }, [profile, setProfile]);

  return null;
}
