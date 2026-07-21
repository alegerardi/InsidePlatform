import { createClient } from "../supabase/server";

export async function recordEventPageView(eventId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("record_event_page_view", {
    target_event_id: eventId,
  });

  if (error) {
    console.warn("recordEventPageView failed", {
      eventId,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });
  }
}