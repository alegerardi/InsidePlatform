import Link from "next/link";
import type { Profile } from "../../lib/auth/get-profile";
import type { TicketWithEvent } from "../../lib/tickets/get-ticket";

type ClientDashboardProps = {
  profile: Profile;
  tickets: TicketWithEvent[];
};

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ClientDashboard({ profile, tickets }: ClientDashboardProps) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="text-xl font-semibold">Client Dashboard</h2>

      <p className="mt-2 text-gray-600">
        Welcome, {profile.full_name ?? profile.email}.
      </p>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Your tickets</h3>

        {tickets.length > 0 ? (
          <div className="mt-4 grid gap-4">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {ticket.events?.title ?? "Event"}
                    </h4>

                    {ticket.events?.starts_at ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {formatEventDate(ticket.events.starts_at)}
                      </p>
                    ) : null}

                    {ticket.events?.location ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {ticket.events.location}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border px-2 py-1 text-xs">
                        {ticket.status}
                      </span>

                      <span className="rounded-full border px-2 py-1 font-mono text-xs">
                        {ticket.ticket_code}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
                  >
                    Open ticket
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-gray-600">
            You do not have any tickets yet.
          </div>
        )}
      </div>
    </section>
  );
}