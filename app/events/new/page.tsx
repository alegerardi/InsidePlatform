import { redirect } from "next/navigation";
import { CreateEventForm } from "../../../components/events/create-event-form";
import { getProfile } from "../../../lib/auth/get-profile";
import { requireUser } from "../../../lib/auth/require-user";

type NewEventPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const user = await requireUser("/events/new");
  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/login?next=/events/new");
  }

  if (profile.role !== "event_organizer" && profile.role !== "admin") {
    redirect("/unauthorized");
  }

  const params = await searchParams;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500">Organizer tools</p>
        <h1 className="mt-2 text-3xl font-bold">Create event</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Create a public event page. After creation, the platform will generate
          a unique shareable event link automatically.
        </p>
      </div>

      <CreateEventForm error={params?.error} />
    </main>
  );
}