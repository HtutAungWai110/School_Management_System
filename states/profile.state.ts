"use client"

import { create } from "zustand";
import { Profile } from "@/types/profile.type";

interface ProfileStore {
  profile: Profile;
  setProfile: (profile: Profile) => void;

}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: {} as Profile,
  setProfile: (profile: Profile) => set(() => ({ profile })),
}));
