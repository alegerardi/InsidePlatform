"use server";

import { redirect } from "next/navigation";
import { getUser } from "../auth/get-user";
import { checkInMemoryRateLimit } from "../rate-limit/in-memory-rate-limit";
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
  ticket_type_id?: string;
  ticket_type_title?: string;
  ticket_price_cents?: number;
  ticket_currency?: string;
  debug_id?: string;
};

const TICKET_CLAIM_RATE_LIMIT = {
  limit: 10,
  windowMs: 60_000,
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
  const ticketTypeId = getString(formData, "ticket_type_id");

  if (!eventId || !eventSlug) {
    redirect("/dashboard");
  }

  const user = await getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/events/${eventSlug}`)}`);
  }

  if (!ticketTypeId) {
    redirectToEventWithMessage(
      eventSlug,
      "error",
      "Choose a ticket type before claiming your ticket."
    );
  }

  const rateLimitResult = checkInMemoryRateLimit({
    key: `ticket-claim:${user.id}:${eventId}`,
    limit: TICKET_CLAIM_RATE_LIMIT.limit,
    windowMs: TICKET_CLAIM_RATE_LIMIT.windowMs,
  });

  if (!rateLimitResult.allowed) {
    redirectToEventWithMessage(
      eventSlug,
      "error",
      `Too many ticket claim attempts. Please wait ${rateLimitResult.retryAfterSeconds} seconds and try again.`
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("claim_ticket_for_type", {
    target_event_id: eventId,
    target_ticket_type_id: ticketTypeId,
  });

  if (error) {
    const debugId = createDebugId();

    console.error("claimTicketAction RPC error", {
      debugId,
      action: "ticket_claim",
      eventId,
      eventSlug,
      ticketTypeId,
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
      ticketTypeId,
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
      ticketTypeId,
      userId: user.id,
      result: result.result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  }

  const safeMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.message;

  redirectToEventWithMessage(
    eventSlug,
    result.success ? "message" : "error",
    safeMessage
  );
}