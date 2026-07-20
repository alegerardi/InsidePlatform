import { createClient } from "../supabase/server";

export type StaffAssignedEvent = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "draft" | "published" | "active" | "completed" | "cancelled";
  organizer_id: string;
};

export async function getStaffAssignedEvents() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_staff_events");

  if (error || !data) {
    return [];
  }

  return data as StaffAssignedEvent[];
}