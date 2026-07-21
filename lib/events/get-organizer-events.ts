import { createClient } from "../supabase/server";

export type OrganizerEvent = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: "draft" | "published" | "active" | "completed" | "cancelled";
  max_tickets: number;
  max_guest_list: number;
  organizer_id: string;
  created_at: string;
};

export type OrganizerEventGroups = {
  upcomingEvents: OrganizerEvent[];
  ongoingEvents: OrganizerEvent[];
  pastEvents: OrganizerEvent[];
};

const ONGOING_FALLBACK_HOURS = 12;

function getEventCategory(event: OrganizerEvent, nowMs: number) {
  const startsAtMs = new Date(event.starts_at).getTime();

  if (startsAtMs > nowMs) {
    return "upcoming";
  }

  const endsAtMs = event.ends_at
    ? new Date(event.ends_at).getTime()
    : startsAtMs + ONGOING_FALLBACK_HOURS * 60 * 60 * 1000;

  if (endsAtMs >= nowMs) {
    return "ongoing";
  }

  return "past";
}

export async function getOrganizerEventGroups(
  organizerId: string
): Promise<OrganizerEventGroups> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, slug, description, location, starts_at, ends_at, status, max_tickets, max_guest_list, organizer_id, created_at"
    )
    .eq("organizer_id", organizerId)
    .order("starts_at", { ascending: true });

  if (error || !data) {
    return {
      upcomingEvents: [],
      ongoingEvents: [],
      pastEvents: [],
    };
  }

  const nowMs = Date.now();
  const events = data as OrganizerEvent[];

  const upcomingEvents: OrganizerEvent[] = [];
  const ongoingEvents: OrganizerEvent[] = [];
  const pastEvents: OrganizerEvent[] = [];

  for (const event of events) {
    const category = getEventCategory(event, nowMs);

    if (category === "upcoming") {
      upcomingEvents.push(event);
    } else if (category === "ongoing") {
      ongoingEvents.push(event);
    } else {
      pastEvents.push(event);
    }
  }

  pastEvents.sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()
  );

  return {
    upcomingEvents,
    ongoingEvents,
    pastEvents,
  };
}