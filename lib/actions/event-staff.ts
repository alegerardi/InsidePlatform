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
    | "unauthorized"
    | "event_not_found"
    | "staff_not_found"
    | "error";
  message: string;
  staff_email?: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getSafeRedirectPath(formData: FormData) {
  const redirectPath = getString(formData, "redirect_path");

  if (
    !redirectPath ||
    !redirectPath.startsWith("/") ||
    redirectPath.startsWith("//") ||
    redirectPath.includes("://")
  ) {
    return "/dashboard";
  }

  return redirectPath;
}

function redirectWithFeedback(
  redirectPath: string,
  type: "message" | "error",
  message: string
): never {
  const params = new URLSearchParams();
  params.set(type, message);

  const separator = redirectPath.includes("?") ? "&" : "?";

  redirect(`${redirectPath}${separator}${params.toString()}`);
}

export async function addEventStaffAction(formData: FormData) {
  await requireUser("/dashboard");

  const eventId = getString(formData, "event_id");
  const staffEmail = getString(formData, "staff_email").toLowerCase();
  const redirectPath = getSafeRedirectPath(formData);

  if (!eventId) {
    redirect("/dashboard");
  }

  if (!staffEmail) {
    redirectWithFeedback(redirectPath, "error", "Staff email is required.");
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
      eventId,
      staffEmail,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectWithFeedback(
      redirectPath,
      "error",
      `Could not add staff. Reference: ${debugId}`
    );
  }

  if (!data) {
    const debugId = crypto.randomUUID();

    console.error("addEventStaffAction empty response", {
      debugId,
      eventId,
      staffEmail,
      timestamp: new Date().toISOString(),
    });

    redirectWithFeedback(
      redirectPath,
      "error",
      `Could not add staff. Reference: ${debugId}`
    );
  }

  const result = data as AssignStaffResponse;

  revalidatePath("/dashboard");
  revalidatePath(redirectPath);

  const safeMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.result === "already_assigned"
        ? `This staff member is already assigned: ${result.staff_email ?? staffEmail}`
        : result.staff_email
          ? `Staff added: ${result.staff_email}`
          : result.message;

  redirectWithFeedback(
    redirectPath,
    result.success ? "message" : "error",
    safeMessage
  );
}