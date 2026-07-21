import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EditEventForm } from "../../../../components/events/edit-event-form";
import { getProfile } from "../../../../lib/auth/get-profile";
import { requireUser } from "../../../../lib/auth/require-user";
import { getEventForEdit } from "../../../../lib/events/get-event-for-edit";

type EditEventPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function EditEventPage({
  params,
  searchParams,
}: EditEventPageProps) {
  const user = await requireUser("/dashboard");
  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "event_organizer" && profile.role !== "admin") {
    redirect("/unauthorized");
  }

  const { slug } = await params;
  const query = await searchParams;
  const data = await getEventForEdit(slug);

  if (!data) {
    notFound();
  }

  if (profile.role !== "admin" && data.event.organizer_id !== user.id) {
    redirect("/unauthorized");
  }

  if (!data.canEdit) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-lg border p-8">
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Event editor
          </p>

          <h1 className="mt-3 text-3xl font-bold">{data.event.title}</h1>

          <p className="mt-4 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-yellow-800">
            This event can no longer be edited because it has already started.
            Ongoing and past events are read-only.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/dashboard"
              className="rounded-md bg-black px-5 py-3 font-medium text-white"
            >
              Go to dashboard
            </Link>

            {data.event.slug ? (
              <Link
                href={`/events/${data.event.slug}`}
                className="rounded-md border px-5 py-3 font-medium"
              >
                Open public page
              </Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500">Organizer tools</p>
        <h1 className="mt-2 text-3xl font-bold">Edit event</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          You can edit details and ticket types only while the event is upcoming.
        </p>
      </div>

      <EditEventForm
        event={data.event}
        ticketTypes={data.ticketTypes}
        error={query?.error}
        message={query?.message}
      />
    </main>
  );
}