import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCodeScanner } from "../../../../../components/staff/qr-code-scanner";
import { validateTicketCodeAction } from "../../../../../lib/actions/manual-validation";
import { requireUser } from "../../../../../lib/auth/require-user";
import { getStaffAssignedEvents } from "../../../../../lib/staff/get-staff-events";

type StaffManualValidatePageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    message?: string;
    error?: string;
    ticketCode?: string;
  }>;
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function StaffManualValidatePage({
  params,
  searchParams,
}: StaffManualValidatePageProps) {
  await requireUser("/dashboard");

  const { eventId } = await params;
  const query = await searchParams;
  const events = await getStaffAssignedEvents();
  const event = events.find((assignedEvent) => assignedEvent.id === eventId);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-gray-500">Staff validation</p>

        <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>

        <p className="mt-2 text-gray-600">{formatEventDate(event.starts_at)}</p>

        {event.location ? (
          <p className="mt-1 text-gray-600">{event.location}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <QrCodeScanner eventId={event.id} />

        <section className="rounded-lg border p-5">
          <div>
            <h2 className="text-lg font-semibold">Manual validation</h2>

            <p className="mt-1 text-sm text-gray-600">
              Use this if the camera fails or the QR code cannot be scanned.
            </p>
          </div>

          {query?.message ? (
            <p className="mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              {query.message}
            </p>
          ) : null}

          {query?.error ? (
            <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {query.error}
            </p>
          ) : null}

          <form action={validateTicketCodeAction} className="mt-5 grid gap-4">
            <input type="hidden" name="event_id" value={event.id} />

            <div className="flex flex-col gap-2">
              <label htmlFor="ticket_code" className="text-sm font-medium">
                Ticket code
              </label>

              <input
                id="ticket_code"
                name="ticket_code"
                type="text"
                required
                defaultValue={query?.ticketCode ?? ""}
                placeholder="ABC-1234"
                className="rounded-md border px-3 py-2 uppercase"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-black px-4 py-2 font-medium text-white"
            >
              Validate code
            </button>
          </form>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/dashboard"
          className="rounded-md border px-5 py-3 font-medium"
        >
          Back to dashboard
        </Link>

        {event.slug ? (
          <Link
            href={`/events/${event.slug}`}
            className="rounded-md border px-5 py-3 font-medium"
          >
            Open public event page
          </Link>
        ) : null}
      </div>
    </main>
  );
}