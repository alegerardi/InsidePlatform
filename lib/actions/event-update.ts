"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/require-user";
import { createClient } from "../supabase/server";

type UpdateEventResponse = {
  success: boolean;
  result:
    | "success"
    | "unauthorized"
    | "event_not_found"
    | "event_not_editable"
    | "invalid_event"
    | "invalid_ticket_types"
    | "error";
  message: string;
  debug_id?: string;
};

type ParsedTicketType = {
  id: string | null;
  title: string;
  description: string | null;
  price_cents: number;
  max_quantity: number | null;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function redirectToEdit(
  eventSlug: string,
  type: "message" | "error",
  message: string
): never {
  redirect(`/events/${eventSlug}/edit?${type}=${encodeURIComponent(message)}`);
}

function parseDateTimeLocal(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function parsePriceToCents(value: string) {
  const normalized = value.replace(",", ".").trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const [eurosPart, centsPart = ""] = normalized.split(".");
  const euros = Number(eurosPart);
  const cents = Number(centsPart.padEnd(2, "0"));

  if (!Number.isInteger(euros) || !Number.isInteger(cents)) {
    return null;
  }

  return euros * 100 + cents;
}

function parseOptionalPositiveInteger(value: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return Number.NaN;
  }

  return parsed;
}

function parseTicketTypes(
  formData: FormData,
  eventSlug: string
): ParsedTicketType[] {
  const ticketTypes: ParsedTicketType[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const id = getString(formData, `ticket_type_${index}_id`) || null;
    const title = getString(formData, `ticket_type_${index}_title`);
    const description = getString(formData, `ticket_type_${index}_description`);
    const priceValue = getString(formData, `ticket_type_${index}_price`);
    const maxQuantityValue = getString(
      formData,
      `ticket_type_${index}_max_quantity`
    );

    const hasVisibleValue = Boolean(
      title || description || priceValue || maxQuantityValue
    );

    if (!hasVisibleValue) {
      if (index === 1) {
        redirectToEdit(eventSlug, "error", "At least one ticket type is required.");
      }

      continue;
    }

    if (!title) {
      redirectToEdit(eventSlug, "error", `Ticket type ${index}: title is required.`);
    }

    if (!priceValue) {
      redirectToEdit(eventSlug, "error", `Ticket type ${index}: price is required.`);
    }

    const priceCents = parsePriceToCents(priceValue);

    if (priceCents === null || priceCents < 0) {
      redirectToEdit(eventSlug, "error", `Ticket type ${index}: insert a valid price.`);
    }

    const maxQuantity = parseOptionalPositiveInteger(maxQuantityValue);

    if (Number.isNaN(maxQuantity)) {
      redirectToEdit(
        eventSlug,
        "error",
        `Ticket type ${index}: max quantity must be at least 1.`
      );
    }

    ticketTypes.push({
      id,
      title,
      description: description || null,
      price_cents: priceCents,
      max_quantity: maxQuantity,
    });
  }

  if (ticketTypes.length === 0) {
    redirectToEdit(eventSlug, "error", "At least one ticket type is required.");
  }

  return ticketTypes;
}

export async function updateEventAction(formData: FormData) {
  await requireUser("/dashboard");

  const eventId = getString(formData, "event_id");
  const eventSlug = getString(formData, "event_slug");

  if (!eventId || !eventSlug) {
    redirect("/dashboard");
  }

  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const location = getString(formData, "location");
  const startsAtValue = getString(formData, "starts_at");
  const endsAtValue = getString(formData, "ends_at");
  const maxTickets = Number(getString(formData, "max_tickets"));
  const maxGuestList = Number(getString(formData, "max_guest_list"));

  const startsAt = parseDateTimeLocal(startsAtValue);
  const endsAt = endsAtValue ? parseDateTimeLocal(endsAtValue) : null;
  const ticketTypes = parseTicketTypes(formData, eventSlug);

  if (!title) {
    redirectToEdit(eventSlug, "error", "Event title is required.");
  }

  if (!location) {
    redirectToEdit(eventSlug, "error", "Event location is required.");
  }

  if (!startsAt) {
    redirectToEdit(eventSlug, "error", "Valid start date and time are required.");
  }

  if (endsAtValue && !endsAt) {
    redirectToEdit(eventSlug, "error", "Valid end date and time are required.");
  }

  if (!Number.isInteger(maxTickets) || maxTickets < 1) {
    redirectToEdit(eventSlug, "error", "Maximum tickets must be at least 1.");
  }

  if (!Number.isInteger(maxGuestList) || maxGuestList < 0) {
    redirectToEdit(eventSlug, "error", "Guest-list limit cannot be negative.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "update_upcoming_event_with_ticket_types",
    {
      target_event_id: eventId,
      new_title: title,
      new_description: description || null,
      new_location: location,
      new_starts_at: startsAt.toISOString(),
      new_ends_at: endsAt ? endsAt.toISOString() : null,
      new_max_tickets: maxTickets,
      new_max_guest_list: maxGuestList,
      ticket_types_json: ticketTypes,
    }
  );

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("updateEventAction RPC error", {
      debugId,
      action: "event_update",
      eventId,
      eventSlug,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectToEdit(
      eventSlug,
      "error",
      `We could not update this event. Please try again. Reference: ${debugId}`
    );
  }

  if (!data) {
    const debugId = crypto.randomUUID();

    console.error("updateEventAction empty RPC response", {
      debugId,
      action: "event_update",
      eventId,
      eventSlug,
      timestamp: new Date().toISOString(),
    });

    redirectToEdit(
      eventSlug,
      "error",
      `We could not update this event. Please try again. Reference: ${debugId}`
    );
  }

  const result = data as UpdateEventResponse;

  if (!result.success) {
    console.warn("updateEventAction business failure", {
      action: "event_update",
      eventId,
      eventSlug,
      result: result.result,
      message: result.message,
      timestamp: new Date().toISOString(),
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath(`/events/${eventSlug}/edit`);

  const safeMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.message;

  redirectToEdit(eventSlug, result.success ? "message" : "error", safeMessage);
}