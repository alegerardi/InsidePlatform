"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "../auth/require-user";
import { slugify } from "../events/slugify";
import { createClient } from "../supabase/server";

type TicketCapacityPool = "paid" | "guest_list";

type ParsedTicketType = {
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  max_quantity: number | null;
  capacity_pool: TicketCapacityPool;
  sort_order: number;
};

type CreateEventResponse = {
  success: boolean;
  result: string;
  message: string;
  event_id?: string;
  slug?: string;
  debug_id?: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);

  return value.length > 0 ? value : null;
}

function getInteger(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (!value) {
    return 0;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getOptionalInteger(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (!value) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function getPriceCents(formData: FormData, key: string) {
  const value = getString(formData, key).replace(",", ".");

  if (!value) {
    return 0;
  }

  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue)) {
    return 0;
  }

  return Math.round(parsedValue * 100);
}

function getCapacityPool(formData: FormData, key: string): TicketCapacityPool {
  const value = getString(formData, key);

  return value === "guest_list" ? "guest_list" : "paid";
}

function parseLocalDateTime(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function parseTicketTypes(formData: FormData) {
  const ticketTypes: ParsedTicketType[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const title = getString(formData, `ticket_type_${index}_title`);

    if (!title) {
      continue;
    }

    ticketTypes.push({
      title,
      description: getOptionalString(
        formData,
        `ticket_type_${index}_description`
      ),
      price_cents: getPriceCents(formData, `ticket_type_${index}_price`),
      currency: getString(formData, `ticket_type_${index}_currency`) || "EUR",
      max_quantity: getOptionalInteger(
        formData,
        `ticket_type_${index}_max_quantity`
      ),
      capacity_pool: getCapacityPool(
        formData,
        `ticket_type_${index}_capacity_pool`
      ),
      sort_order: ticketTypes.length + 1,
    });
  }

  return ticketTypes;
}

function redirectToNewEventWithError(message: string): never {
  const params = new URLSearchParams();
  params.set("error", message);

  redirect(`/events/new?${params.toString()}`);
}

function getCapacitySum(
  ticketTypes: ParsedTicketType[],
  capacityPool: TicketCapacityPool
) {
  return ticketTypes.reduce((total, ticketType) => {
    if (ticketType.capacity_pool !== capacityPool) {
      return total;
    }

    return total + (ticketType.max_quantity ?? 0);
  }, 0);
}

export async function createEventAction(formData: FormData) {
  await requireUser("/dashboard");

  const title = getString(formData, "title");
  const description = getOptionalString(formData, "description");
  const location = getOptionalString(formData, "location");
  const startsAt = parseLocalDateTime(getString(formData, "starts_at"));
  const endsAt = parseLocalDateTime(getString(formData, "ends_at"));

  const maxTickets = getInteger(formData, "max_tickets");
  const maxGuestList = getInteger(formData, "max_guest_list");

  const ticketTypes = parseTicketTypes(formData);

  if (!title) {
    redirectToNewEventWithError("Event title is required.");
  }

  if (!startsAt) {
    redirectToNewEventWithError("Event start date is required.");
  }

  if (endsAt && startsAt && new Date(endsAt) <= new Date(startsAt)) {
    redirectToNewEventWithError("Event end date must be after the start date.");
  }

  if (maxTickets < 1) {
    redirectToNewEventWithError("Paid ticket capacity must be at least 1.");
  }

  if (maxGuestList < 0) {
    redirectToNewEventWithError("Guest-list capacity cannot be negative.");
  }

  if (ticketTypes.length === 0) {
    redirectToNewEventWithError("At least one ticket type is required.");
  }

  const paidTicketTypeCapacity = getCapacitySum(ticketTypes, "paid");
  const guestListTicketTypeCapacity = getCapacitySum(ticketTypes, "guest_list");
  const hasGuestListTicketType = ticketTypes.some(
    (ticketType) => ticketType.capacity_pool === "guest_list"
  );

  if (paidTicketTypeCapacity > maxTickets) {
    redirectToNewEventWithError(
      "The sum of paid ticket type quantities cannot exceed paid capacity."
    );
  }

  if (hasGuestListTicketType && maxGuestList < 1) {
    redirectToNewEventWithError(
      "Guest-list capacity must be at least 1 when guest-list tickets exist."
    );
  }

  if (guestListTicketTypeCapacity > maxGuestList) {
    redirectToNewEventWithError(
      "The sum of guest-list ticket type quantities cannot exceed guest-list capacity."
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_event_with_ticket_types", {
    new_title: title,
    new_description: description,
    new_location: location,
    new_starts_at: startsAt,
    new_ends_at: endsAt,
    new_max_tickets: maxTickets,
    new_max_guest_list: maxGuestList,
    new_slug_base: slugify(title),
    ticket_types_json: ticketTypes,
  });

  if (error) {
    const debugId = crypto.randomUUID();

    console.error("createEventAction RPC error", {
      debugId,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      timestamp: new Date().toISOString(),
    });

    redirectToNewEventWithError(`Could not create event. Reference: ${debugId}`);
  }

  if (!data) {
    const debugId = crypto.randomUUID();

    console.error("createEventAction empty response", {
      debugId,
      timestamp: new Date().toISOString(),
    });

    redirectToNewEventWithError(`Could not create event. Reference: ${debugId}`);
  }

  const result = data as CreateEventResponse;

  if (!result.success) {
    const safeMessage =
      result.result === "error" && result.debug_id
        ? `${result.message} Reference: ${result.debug_id}`
        : result.message;

    redirectToNewEventWithError(safeMessage);
  }

  revalidatePath("/dashboard");

  if (result.slug) {
    revalidatePath(`/events/${result.slug}`);

    const params = new URLSearchParams();
    params.set("event", result.slug);
    params.set("tab", "overview");
    params.set("message", "Event created.");

    redirect(`/dashboard?${params.toString()}`);
  }

  redirect("/dashboard");
}