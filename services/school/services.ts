import { createClient } from "@/lib/supabase/server.client";

export class SchoolService {
  static async overview() {
    const supabase = await createClient();

    const { count: studentCount, error: studentError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    const { count: teacherCount, error: teacherError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    if (studentError || teacherError) {
      throw new Error("Failed to fetch counts");
    }

    return { studentCount, teacherCount };
  }
}
