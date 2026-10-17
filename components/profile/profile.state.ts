"use client"

import { create } from "zustand";
import { Profile } from "@/types/profile.type";

interface ProfileStore {
  profile: Profile;
  /** Distinguishes "no profile loaded yet" from "loaded, but this user has no
   *  id". Without it, consumers keyed on the id cannot tell a signed-in user
   *  mid-hydration from a signed-out one, and show an empty state before their
   *  first load has even been attempted. */
  hydrated: boolean;
  setProfile: (profile: Profile) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: {} as Profile,
  hydrated: false,
  setProfile: (profile: Profile) => set(() => ({ profile, hydrated: true })),
}));