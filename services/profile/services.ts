import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { NotificationsService } from "@/services/notifications/services";
import { buildProfileUpdatedNotification, type ProfileSnapshot } from "@/lib/notification.util";

/** Fields read before an edit purely to diff it afterwards. */
const SNAPSHOT_COLUMNS = "id, full_name, email, phone, address, date_of_birth, role, avatar_url";

export class ProfileService {
  /**
   * Pre-edit read, used only to build the notification diff. PostgREST
   * `.update().select()` returns the new row alone, so without this snapshot
   * the old values are unrecoverable.
   *
   * Best-effort by design: if RLS hides the row from the actor, or the read
   * fails, the edit must still go through — we just skip the notification.
   */
  private static async readSnapshot(id: string): Promise<ProfileSnapshot | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(SNAPSHOT_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return data as ProfileSnapshot;
  }

  /**
   * Tells every admin that a profile changed. Deliberately never throws: the
   * profile write has already succeeded, and failing the request now would
   * report an error for work that was actually saved.
   */
  private static async notifyAdminsOfProfileUpdate(before: ProfileSnapshot | null, after: ProfileSnapshot) {
    if (!before) return;

    const notification = buildProfileUpdatedNotification(before, after);
    if (!notification) return;

    const supabase = await createClient();

    const { data: adminIds, error: adminsError } = await supabase.rpc("get_admin_ids");

    if (adminsError) {
      console.error("[notifications] get_admin_ids failed:", adminsError.message);
      return;
    }

    // Skip the case where an admin edited their own profile and would
    // otherwise be notified about it.
    const recipients = ((adminIds ?? []) as Array<{ profile_id: string }>)
      .map((row) => row.profile_id)
      .filter((recipientId) => recipientId && recipientId !== after.id);

    const results = await Promise.allSettled(
      recipients.map((recipientId) =>
        NotificationsService.create({
          data: notification,
          senderIds: [after.id],
          recipientId,
          type: "profile_updated",
        }),
      ),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[notifications] create failed:", result.reason);
      }
    }
  }

  static async patch(id: string, data: Record<string, unknown>) {
    const supabase = await createClient();

    const allowed = ["date_of_birth", "phone", "address", "avatar_url"];
    const payload: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) payload[key] = data[key];
    }

    const before = await ProfileService.readSnapshot(id);

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

    const after = profileData[0] as ProfileSnapshot;
    await ProfileService.notifyAdminsOfProfileUpdate(before, after);

    return { profileData: after, id };
  }

  static async update(id: string, data: Record<string, unknown>) {
    const supabase = await createClient();

    const before = await ProfileService.readSnapshot(id);

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

    const after = profileData[0] as ProfileSnapshot;
    await ProfileService.notifyAdminsOfProfileUpdate(before, after);

    return { profileData: after, id };
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
