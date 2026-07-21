import { notFound, redirect } from "next/navigation";
import { EventStatisticsView } from "../../../../components/events/event-statistics-view";
import { getProfile } from "../../../../lib/auth/get-profile";
import { requireUser } from "../../../../lib/auth/require-user";
import { getEventForStats } from "../../../../lib/events/get-event-for-stats";
import { getOrganizerStatsData } from "../../../../lib/events/get-organizer-event-stats";

type EventStatsPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const ONGOING_FALLBACK_HOURS = 12;

function getEventCategory(event: {
  starts_at: string;
  ends_at: string | null;
}) {
  const nowMs = Date.now();
  const startsAtMs = new Date(event.starts_at).getTime();

  if (startsAtMs > nowMs) {
    return "upcoming" as const;
  }

  const endsAtMs = event.ends_at
    ? new Date(event.ends_at).getTime()
    : startsAtMs + ONGOING_FALLBACK_HOURS * 60 * 60 * 1000;

  if (endsAtMs >= nowMs) {
    return "ongoing" as const;
  }

  return "past" as const;
}

export default async function EventStatsPage({ params }: EventStatsPageProps) {
  const user = await requireUser("/dashboard");
  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "event_organizer" && profile.role !== "admin") {
    redirect("/unauthorized");
  }

  const { slug } = await params;
  const event = await getEventForStats(slug);

  if (!event) {
    notFound();
  }

  if (profile.role !== "admin" && event.organizer_id !== user.id) {
    redirect("/unauthorized");
  }

  const category = getEventCategory(event);
  const statsData = await getOrganizerStatsData();

  const eventStats = statsData.eventStats.find(
    (stats) => stats.event_id === event.id
  );

  const ticketTypeStats = statsData.ticketTypeStats.filter(
    (stats) => stats.event_id === event.id
  );

  const entranceTimeStats = statsData.entranceTimeStats.filter(
    (stats) => stats.event_id === event.id
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <EventStatisticsView
        event={event}
        category={category}
        eventStats={eventStats}
        ticketTypeStats={ticketTypeStats}
        entranceTimeStats={entranceTimeStats}
      />
    </main>
  );
}