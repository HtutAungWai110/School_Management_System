import type { Profile } from "@/types/profile.type";

export type TeacherModule = {
  id: string;
  assigned_at: string;
  modules: {
    id: string;
    code: string;
    title: string;
  } | null;
};

export type Teacher = Profile & {
  teacher_modules: TeacherModule[] | null;
};
