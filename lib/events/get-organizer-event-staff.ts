import { createClient } from "../supabase/server";

export type EventStaffAssignment = {
  event_id: string;
  staff_user_id: string;
  staff_email: string;
};

export async function getOrganizerEventStaffAssignments() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_my_event_staff_assignments"
  );

  if (error || !data) {
    return [];
  }

  return data as EventStaffAssignment[];
}