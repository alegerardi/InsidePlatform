import { createClient } from "../supabase/server";

export async function getUserTicketForEvent(eventId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_code, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as {
    id: string;
    ticket_code: string;
    status: string;
  };
}