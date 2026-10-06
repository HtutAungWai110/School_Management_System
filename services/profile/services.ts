import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";

export class ProfileService {
  static async patch(id: string, data: Record<string, unknown>) {
    const supabase = await createClient();

    const allowed = ["date_of_birth", "phone", "address", "avatar_url"];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) payload[key] = data[key];
    }

    const { data: profileData, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    if (!profileData || profileData.length === 0) {
      throw new HttpError(403, "RLS violation: You do not have permission to update this profile.");
    }

    return { profileData: profileData[0], id };
  }

  static async update(id: string, data: Record<string, unknown>) {
    const supabase = await createClient();

    const { data: profileData, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    if (!profileData || profileData.length === 0) {
      throw new HttpError(403, "RLS violation: You do not have permission to update this profile.");
    }

    return { profileData: profileData[0], id };
  }

  static async remove(id: string) {
    const supabase = await createClient();

    const { error: assignmentsError } = await supabase
      .from("batch_assignments")
      .delete()
      .eq("student_id", id);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }
}
