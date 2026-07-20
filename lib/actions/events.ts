"use server";

import { redirect } from "next/navigation";
import { getProfile } from "../auth/get-profile";
import { requireUser } from "../auth/require-user";
import { createClient } from "../supabase/server";
import { randomSlugSuffix, slugify } from "../events/slugify";

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

    if (!error && data?.slug) {
      return data.slug as string;
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

  const endsAt = endsAtValue ? parseDateTimeLocal(endsAtValue) : null;

  if (endsAtValue && !endsAt) {
    redirectWithError("Valid end date and time are required.");
  }

  if (endsAt && startsAt && endsAt <= startsAt) {
    redirectWithError("End date must be after start date.");
  }

  if (!Number.isInteger(maxTickets) || maxTickets < 1) {
    redirectWithError("Maximum tickets must be at least 1.");
  }

  if (!Number.isInteger(maxGuestList) || maxGuestList < 0) {
    redirectWithError("Guest list limit cannot be negative.");
  }

  let slug: string;

  try {
    slug = await insertEventWithSlug({
      title,
      description: description || null,
      location,
      startsAtIso: startsAt.toISOString(),
      endsAtIso: endsAt ? endsAt.toISOString() : null,
      maxTickets,
      maxGuestList,
      organizerId: user.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong creating the event.";

    redirectWithError(message);
  }

  redirect(`/events/${slug}`);
}