"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/require-user";
import { createClient } from "../supabase/server";

type AssignStaffResponse = {
  success: boolean;
  result:
    | "success"
    | "already_assigned"
    | "staff_not_found"
    | "invalid_email"
    | "event_not_found"
    | "unauthorized"
    | "error";
  message: string;
  staff_email?: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectToDashboardWithStaffMessage(params: {
  eventId: string;
  type: "staffMessage" | "staffError";
  message: string;
}): never {
  const searchParams = new URLSearchParams({
    staffEventId: params.eventId,
    [params.type]: params.message,
  });

  redirect(`/dashboard?${searchParams.toString()}`);
}

export async function addEventStaffAction(formData: FormData) {
  await requireUser("/dashboard");

  const eventId = getString(formData, "event_id");
  const staffEmail = getString(formData, "staff_email").toLowerCase();

  if (!eventId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("assign_event_staff_by_email", {
    target_event_id: eventId,
    target_staff_email: staffEmail,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("addEventStaffAction RPC error", {
      debugId,
      action: "event_staff_assign",
      eventId,
      staffEmail,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectToDashboardWithStaffMessage({
      eventId,
      type: "staffError",
      message: `We could not add this staff member. Please try again. Reference: ${debugId}`,
    });
  }

  const result = data as AssignStaffResponse;

  if (!result.success) {
    console.warn("addEventStaffAction business failure", {
      action: "event_staff_assign",
      eventId,
      staffEmail,
      result: result.result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  }

  revalidatePath("/dashboard");

  const safeMessage =
  result.result === "error" && result.debug_id
    ? `${result.message} Reference: ${result.debug_id}`
    : result.result === "already_assigned"
      ? `This staff member is already assigned: ${result.staff_email}`
      : result.staff_email
        ? `Staff added: ${result.staff_email}`
        : result.message;

  redirectToDashboardWithStaffMessage({
    eventId,
    type: result.success ? "staffMessage" : "staffError",
    message: safeMessage,
  });
}