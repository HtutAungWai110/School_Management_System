"use client"

import { create } from "zustand";
import { Level } from "@/types/module.type";

interface LevelsStore {
  levels: Level[];
  loading: boolean;
  error: string | null;
  setLevels: (levels: Level[]) => void;
  fetchLevels: () => Promise<void>;
}

export const useLevelsStore = create<LevelsStore>((set) => ({
  levels: [],
  loading: false,
  error: null,
  setLevels: (levels: Level[]) => set(() => ({ levels })),
  fetchLevels: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/levels");
      if (!res.ok) {
        throw new Error(`Failed to fetch levels: ${res.status}`);
      }
      const levels = (await res.json()) as Level[];
      set({ levels, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch levels",
        loading: false,
      });
    }
  },
}));
