"use server";

import { redirect } from "next/navigation";
import { getProfile } from "../auth/get-profile";
import { requireUser } from "../auth/require-user";
import { randomSlugSuffix, slugify } from "../events/slugify";
import { createClient } from "../supabase/server";

type ParsedTicketType = {
  title: string;
  description: string | null;
  price_cents: number;
  currency: "EUR";
  max_quantity: number | null;
  sort_order: number;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getInteger(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (!value) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
}

function redirectWithError(message: string): never {
  redirect(`/events/new?error=${encodeURIComponent(message)}`);
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

function parseTicketTypes(formData: FormData): ParsedTicketType[] {
  const ticketTypes: ParsedTicketType[] = [];

  for (let index = 1; index <= 3; index += 1) {
    const title = getString(formData, `ticket_type_${index}_title`);
    const description = getString(formData, `ticket_type_${index}_description`);
    const priceValue = getString(formData, `ticket_type_${index}_price`);
    const maxQuantityValue = getString(formData, `ticket_type_${index}_max_quantity`);

    const hasAnyValue = Boolean(title || description || priceValue || maxQuantityValue);

    if (!hasAnyValue) {
      continue;
    }

    if (!title) {
      redirectWithError(`Ticket type ${index}: title is required.`);
    }

    if (!priceValue) {
      redirectWithError(`Ticket type ${index}: price is required.`);
    }

    const priceCents = parsePriceToCents(priceValue);

    if (priceCents === null || priceCents < 0) {
      redirectWithError(`Ticket type ${index}: insert a valid price.`);
    }

    const maxQuantity = parseOptionalPositiveInteger(maxQuantityValue);

    if (Number.isNaN(maxQuantity)) {
      redirectWithError(`Ticket type ${index}: max quantity must be at least 1.`);
    }

    ticketTypes.push({
      title,
      description: description || null,
      price_cents: priceCents,
      currency: "EUR",
      max_quantity: maxQuantity,
      sort_order: index - 1,
    });
  }

  if (ticketTypes.length === 0) {
    redirectWithError("At least one ticket type is required.");
  }

  return ticketTypes;
}

async function insertEventWithSlug(params: {
  title: string;
  description: string | null;
  location: string | null;
  startsAtIso: string;
  endsAtIso: string | null;
  maxTickets: number;
  maxGuestList: number;
  organizerId: string;
}) {
  const supabase = await createClient();
  const baseSlug = slugify(params.title);

  const candidateSlugs = [
    baseSlug,
    `${baseSlug}-${randomSlugSuffix()}`,
    `${baseSlug}-${randomSlugSuffix()}`,
  ];

  for (const slug of candidateSlugs) {
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: params.title,
        slug,
        description: params.description,
        location: params.location,
        starts_at: params.startsAtIso,
        ends_at: params.endsAtIso,
        status: "published",
        max_tickets: params.maxTickets,
        max_guest_list: params.maxGuestList,
        organizer_id: params.organizerId,
      })
      .select("id, slug")
      .single();

    if (!error && data?.id && data?.slug) {
      return {
        eventId: data.id as string,
        slug: data.slug as string,
      };
    }

    const isUniqueSlugError =
      error?.code === "23505" ||
      error?.message?.toLowerCase().includes("duplicate");

    if (!isUniqueSlugError) {
      throw new Error(error?.message ?? "Failed to create event.");
    }
  }

  throw new Error("Could not generate a unique event link.");
}

async function insertTicketTypes(params: {
  eventId: string;
  ticketTypes: ParsedTicketType[];
}) {
  const supabase = await createClient();

  const rows = params.ticketTypes.map((ticketType) => ({
    event_id: params.eventId,
    title: ticketType.title,
    description: ticketType.description,
    price_cents: ticketType.price_cents,
    currency: ticketType.currency,
    max_quantity: ticketType.max_quantity,
    is_active: true,
    sort_order: ticketType.sort_order,
  }));

  const { error } = await supabase.from("ticket_types").insert(rows);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createEventAction(formData: FormData) {
  const user = await requireUser("/events/new");
  const profile = await getProfile(user.id);

  if (!profile) {
    redirectWithError("Profile not found. Try logging in again.");
  }

  if (profile.role !== "event_organizer" && profile.role !== "admin") {
    redirect("/unauthorized");
  }

  const title = getString(formData, "title");
  const description = getString(formData, "description");
  const location = getString(formData, "location");
  const startsAtValue = getString(formData, "starts_at");
  const endsAtValue = getString(formData, "ends_at");
  const maxTickets = getInteger(formData, "max_tickets");
  const maxGuestList = getInteger(formData, "max_guest_list");
  const ticketTypes = parseTicketTypes(formData);

  if (!title) {
    redirectWithError("Event title is required.");
  }

  if (!location) {
    redirectWithError("Event location is required.");
  }

  const startsAt = parseDateTimeLocal(startsAtValue);

  if (!startsAt) {
    redirectWithError("Valid start date and time are required.");
  }

  if (startsAt <= new Date()) {
    redirectWithError("Event start date must be in the future.");
  }

  const endsAt = endsAtValue ? parseDateTimeLocal(endsAtValue) : null;

  if (endsAtValue && !endsAt) {
    redirectWithError("Valid end date and time are required.");
  }

  if (endsAt && endsAt <= startsAt) {
    redirectWithError("End date must be after start date.");
  }

  if (!Number.isInteger(maxTickets) || maxTickets < 1) {
    redirectWithError("Maximum tickets must be at least 1.");
  }

  if (!Number.isInteger(maxGuestList) || maxGuestList < 0) {
    redirectWithError("Guest list limit cannot be negative.");
  }

  const totalTicketTypeCapacity = ticketTypes.reduce((total, ticketType) => {
    return total + (ticketType.max_quantity ?? 0);
  }, 0);

  if (totalTicketTypeCapacity > maxTickets) {
    redirectWithError(
      "The sum of ticket type quantities cannot be greater than the event maximum tickets."
    );
  }

  let createdEvent: {
    eventId: string;
    slug: string;
  };

  try {
    createdEvent = await insertEventWithSlug({
      title,
      description: description || null,
      location,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt ? endsAt.toISOString() : null,
      maxTickets,
      maxGuestList,
      organizerId: user.id,
    });

    await insertTicketTypes({
      eventId: createdEvent.eventId,
      ticketTypes,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong creating the event.";

    redirectWithError(message);
  }

  redirect(`/events/${createdEvent.slug}`);
}