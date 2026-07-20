import Link from "next/link";
import { notFound } from "next/navigation";
import { validateTicketCodeAction } from "../../../../../lib/actions/manual-validation";
import { requireUser } from "../../../../../lib/auth/require-user";
import { getStaffAssignedEvents } from "../../../../../lib/staff/get-staff-events";

type StaffValidatePageProps = {
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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function StaffValidatePage({
  params,
  searchParams,
}: StaffValidatePageProps) {
  await requireUser("/dashboard");

  const { eventId } = await params;
  const query = await searchParams;

  const events = await getStaffAssignedEvents();
  const event = events.find((item) => item.id === eventId);

  if (!event) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-lg border p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Staff validation mode
        </p>

        <h1 className="mt-3 text-3xl font-bold">{event.title}</h1>

        <p className="mt-2 text-gray-600">{formatEventDate(event.starts_at)}</p>

        {event.location ? (
          <p className="mt-1 text-gray-600">{event.location}</p>
        ) : null}

        <div className="mt-8 rounded-md border border-dashed p-4">
          <h2 className="font-semibold">Manual ticket validation</h2>

          <form action={validateTicketCodeAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="event_id" value={event.id} />

            <label htmlFor="ticket_code" className="text-sm font-medium">
              Ticket code
            </label>

            <input
              id="ticket_code"
              name="ticket_code"
              type="text"
              required
              defaultValue={query?.ticketCode}
              placeholder="ABC-123456"
              className="rounded-md border px-3 py-2 font-mono uppercase"
            />

            <button
              type="submit"
              className="rounded-md bg-black px-5 py-3 font-medium text-white"
            >
              Validate ticket
            </button>
          </form>

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
        </div>

        <div className="mt-8">
          <Link href="/dashboard" className="rounded-md border px-5 py-3 font-medium">
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}