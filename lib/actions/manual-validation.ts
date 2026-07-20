"use server";

import { redirect } from "next/navigation";
import { requireUser } from "../auth/require-user";
import { createClient } from "../supabase/server";

type ManualValidationResponse = {
  success: boolean;
  result:
    | "success"
    | "already_used"
    | "invalid_ticket"
    | "wrong_event"
    | "unauthorized"
    | "event_not_found"
    | "error";
  message: string;
  ticket_id?: string;
  ticket_code?: string;
  event_title?: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectToManualValidation(params: {
  eventId: string;
  type: "message" | "error";
  message: string;
  ticketCode?: string;
}): never {
  const searchParams = new URLSearchParams({
    [params.type]: params.message,
  });

  if (params.ticketCode) {
    searchParams.set("ticketCode", params.ticketCode);
  }

  redirect(`/staff/events/${params.eventId}/validate?${searchParams.toString()}`);
}

export async function validateTicketCodeAction(formData: FormData) {
  await requireUser("/dashboard");

  const eventId = getString(formData, "event_id");
  const ticketCode = getString(formData, "ticket_code").toUpperCase();

  if (!eventId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("validate_ticket_by_code", {
    target_event_id: eventId,
    target_ticket_code: ticketCode,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("validateTicketCodeAction RPC error", {
      debugId,
      action: "ticket_validate_manual",
      eventId,
      ticketCode,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectToManualValidation({
      eventId,
      type: "error",
      message: `We could not validate this ticket. Please try again. Reference: ${debugId}`,
      ticketCode,
    });
  }

  const result = data as ManualValidationResponse;

  if (!result.success) {
    console.warn("validateTicketCodeAction business failure", {
      action: "ticket_validate_manual",
      eventId,
      ticketCode,
      result: result.result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  }

  const safeMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.message;

  redirectToManualValidation({
    eventId,
    type: result.success ? "message" : "error",
    message: safeMessage,
    ticketCode: result.ticket_code ?? ticketCode,
  });
}