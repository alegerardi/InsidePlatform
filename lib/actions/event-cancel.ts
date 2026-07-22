"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/require-user";
import { createClient } from "../supabase/server";

type CancelEventResponse = {
  success: boolean;
  result: string;
  message: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectWithFeedback(
  eventSlug: string,
  type: "message" | "error",
  message: string
): never {
  const params = new URLSearchParams();

  if (eventSlug) {
    params.set("event", eventSlug);
  }

  params.set("tab", "actions");
  params.set(type, message);

  redirect(`/dashboard?${params.toString()}`);
}

export async function cancelEventAction(formData: FormData) {
  await requireUser("/dashboard");

  const eventId = getString(formData, "event_id");
  const eventSlug = getString(formData, "event_slug");

  if (!eventId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("cancel_event_if_no_revenue", {
    target_event_id: eventId,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("cancelEventAction RPC error", {
      debugId,
      eventId,
      eventSlug,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectWithFeedback(
      eventSlug,
      "error",
      `Could not cancel event. Reference: ${debugId}`
    );
  }

  if (!data) {
    const debugId = crypto.randomUUID();

    console.error("cancelEventAction empty response", {
      debugId,
      eventId,
      eventSlug,
      timestamp: new Date().toISOString(),
    });

    redirectWithFeedback(
      eventSlug,
      "error",
      `Could not cancel event. Reference: ${debugId}`
    );
  }

  const result = data as CancelEventResponse;

  revalidatePath("/dashboard");

  if (eventSlug) {
    revalidatePath(`/events/${eventSlug}`);
    revalidatePath(`/events/${eventSlug}/stats`);
    revalidatePath(`/events/${eventSlug}/edit`);
  }

  const safeMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.message;

  redirectWithFeedback(
    eventSlug,
    result.success ? "message" : "error",
    safeMessage
  );
}