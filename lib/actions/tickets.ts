"use server";

import { redirect } from "next/navigation";
import { getUser } from "../auth/get-user";
import { createClient } from "../supabase/server";

type ClaimTicketResponse = {
  success: boolean;
  result:
    | "success"
    | "already_has_ticket"
    | "sold_out"
    | "event_not_found"
    | "event_not_available"
    | "unauthorized"
    | "error";
  message: string;
  ticket_id?: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectToEventWithMessage(
  eventSlug: string,
  type: "error" | "message",
  message: string
): never {
  redirect(`/events/${eventSlug}?${type}=${encodeURIComponent(message)}`);
}

function createDebugId() {
  return crypto.randomUUID();
}

export async function claimTicketAction(formData: FormData) {
  const eventId = getString(formData, "event_id");
  const eventSlug = getString(formData, "event_slug");

  if (!eventId || !eventSlug) {
    redirect("/dashboard");
  }

  const user = await getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_ticket", {
    target_event_id: eventId,
  });

  if (error) {
    const debugId = createDebugId();

    console.error("claimTicketAction RPC error", {
      debugId,
      action: "ticket_claim",
      eventId,
      eventSlug,
      userId: user.id,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectToEventWithMessage(
      eventSlug,
      "error",
      `We could not claim your ticket. Please try again. Reference: ${debugId}`
    );
  }

  if (!data) {
    const debugId = createDebugId();

    console.error("claimTicketAction empty RPC response", {
      debugId,
      action: "ticket_claim",
      eventId,
      eventSlug,
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    redirectToEventWithMessage(
      eventSlug,
      "error",
      `We could not claim your ticket. Please try again. Reference: ${debugId}`
    );
  }

  const result = data as ClaimTicketResponse;

  if (
    (result.result === "success" || result.result === "already_has_ticket") &&
    result.ticket_id
  ) {
    redirect(`/tickets/${result.ticket_id}`);
  }

  if (!result.success) {
    console.warn("claimTicketAction business failure", {
      action: "ticket_claim",
      eventId,
      eventSlug,
      userId: user.id,
      result: result.result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  }

  const safeMessage =
  result.result === "error" && result.debug_id
    ? `We could not claim your ticket. Please try again. Reference: ${result.debug_id}`
    : result.message;

    redirectToEventWithMessage(
    eventSlug,
    result.success ? "message" : "error",
    safeMessage
    );
}