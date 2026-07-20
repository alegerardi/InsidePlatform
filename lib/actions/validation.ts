"use server";

import { createClient } from "../supabase/server";

export type ValidateTicketResponse = {
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

export async function validateTicketByQrToken(
  qrToken: string
): Promise<ValidateTicketResponse> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("validate_ticket_by_qr", {
    target_qr_token: qrToken,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("validateTicketByQrToken RPC error", {
      debugId,
      action: "ticket_validate",
      qrTokenPrefix: qrToken.slice(0, 8),
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      result: "error",
      message: "We could not validate this ticket. Please try again.",
      debug_id: debugId,
    };
  }

  if (!data) {
    const debugId = crypto.randomUUID();

    console.error("validateTicketByQrToken empty RPC response", {
      debugId,
      action: "ticket_validate",
      qrTokenPrefix: qrToken.slice(0, 8),
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      result: "error",
      message: "We could not validate this ticket. Please try again.",
      debug_id: debugId,
    };
  }

  return data as ValidateTicketResponse;
}