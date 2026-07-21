import { NextResponse } from "next/server";
import { getUser } from "../../../../../lib/auth/get-user";
import { createClient } from "../../../../../lib/supabase/server";

type StaffScanRouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(request: Request, { params }: StaffScanRouteContext) {
  const user = await getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        result: "unauthorized",
        message: "Please log in to validate tickets.",
      },
      { status: 401 }
    );
  }

  const { eventId } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        result: "invalid_request",
        message: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const qrToken =
    typeof body === "object" &&
    body !== null &&
    "qrToken" in body &&
    typeof body.qrToken === "string"
      ? body.qrToken.trim()
      : "";

  if (!eventId || !qrToken) {
    return NextResponse.json(
      {
        success: false,
        result: "invalid_request",
        message: "Missing QR token.",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("validate_ticket_qr_for_event", {
    target_event_id: eventId,
    target_qr_token: qrToken,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("staff QR scan RPC error", {
      debugId,
      action: "ticket_scan",
      eventId,
      userId: user.id,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        result: "error",
        message: `We could not validate this ticket. Please try again. Reference: ${debugId}`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}