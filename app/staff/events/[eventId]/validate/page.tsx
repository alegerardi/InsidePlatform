import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCodeScanner } from "../../../../../components/staff/qr-code-scanner";
import { validateTicketCodeAction } from "../../../../../lib/actions/manual-validation";
import { requireUser } from "../../../../../lib/auth/require-user";
import { getStaffAssignedEvents } from "../../../../../lib/staff/get-staff-events";

type StaffValidationPageProps = {
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
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function StaffValidationPage({
  params,
  searchParams,
}: StaffValidationPageProps) {
  await requireUser("/dashboard");

  const { eventId } = await params;
  const query = await searchParams;

  const assignedEvents = await getStaffAssignedEvents();
  const event = assignedEvents.find(
    (assignedEvent) => assignedEvent.id === eventId
  );

  if (!event) {
    redirect("/unauthorized");
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Back to dashboard
        </Link>

        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/50">
          Staff mode
        </span>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
        <section className="border-b border-white/10 p-8 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.26em] text-white/35">
                Entrance control
              </p>

              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
                {event.title}
              </h1>

              <div className="mt-5 grid gap-3 text-sm text-white/55 md:grid-cols-2">
                <p>{formatEventDate(event.starts_at)}</p>
                <p>{event.location ?? "Location not specified"}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/60">
                {event.status}
              </span>

              {event.slug ? (
                <Link
                  href={`/events/${event.slug}`}
                  className="rounded-full border border-white/15 px-3 py-1 text-sm text-white/60 transition hover:bg-white/10"
                >
                  Public page
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 p-8 md:p-10 lg:grid-cols-[1fr_420px]">
          <QrCodeScanner eventId={event.id} />

          <aside className="grid gap-6">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
                Manual validation
              </p>

              <h2 className="mt-3 text-2xl font-semibold text-white">
                Enter ticket code
              </h2>

              <form action={validateTicketCodeAction} className="mt-6 grid gap-3">
                <input type="hidden" name="event_id" value={event.id} />

                <input
                  name="ticket_code"
                  type="text"
                  defaultValue={query?.ticketCode ?? ""}
                  placeholder="ABC-1234"
                  className="rounded-xl border border-white/15 bg-transparent px-4 py-4 font-mono text-base uppercase tracking-wide text-white outline-none placeholder:text-white/25 focus:border-white/40"
                  autoComplete="off"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:opacity-85"
                >
                  Validate code
                </button>
              </form>

              {query?.message ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  {query.message}
                </p>
              ) : null}

              {query?.error ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  {query.error}
                </p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/35">
                Door workflow
              </p>

              <div className="mt-5 grid gap-4 text-sm text-white/55">
                <p>1. Scan the ticket QR code.</p>
                <p>2. Confirm the result on screen.</p>
                <p>3. Use manual code only if the camera fails.</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}