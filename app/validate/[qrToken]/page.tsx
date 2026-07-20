import Link from "next/link";
import { requireUser } from "../../../lib/auth/require-user";
import { validateTicketByQrToken } from "../../../lib/actions/validation";

type ValidateTicketPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

function getResultStyles(success: boolean, result: string) {
  if (success) {
    return {
      box: "border-green-300 bg-green-50 text-green-800",
      title: "Ticket valid",
    };
  }

  if (result === "already_used") {
    return {
      box: "border-yellow-300 bg-yellow-50 text-yellow-800",
      title: "Ticket already used",
    };
  }

  if (result === "unauthorized") {
    return {
      box: "border-red-300 bg-red-50 text-red-800",
      title: "Unauthorized",
    };
  }

  return {
    box: "border-red-300 bg-red-50 text-red-800",
    title: "Ticket not valid",
  };
}

export default async function ValidateTicketPage({
  params,
}: ValidateTicketPageProps) {
  await requireUser("/dashboard");

  const { qrToken } = await params;
  const result = await validateTicketByQrToken(qrToken);
  const styles = getResultStyles(result.success, result.result);

  const displayMessage =
    result.result === "error" && result.debug_id
      ? `${result.message} Reference: ${result.debug_id}`
      : result.message;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className={`rounded-lg border p-8 ${styles.box}`}>
        <p className="text-sm font-medium uppercase tracking-wide">
          Ticket validation
        </p>

        <h1 className="mt-3 text-3xl font-bold">{styles.title}</h1>

        <p className="mt-4">{displayMessage}</p>

        {result.event_title ? (
          <div className="mt-6 rounded-md bg-white/70 p-4 text-black">
            <p className="text-sm text-gray-500">Event</p>
            <p className="font-semibold">{result.event_title}</p>
          </div>
        ) : null}

        {result.ticket_code ? (
          <div className="mt-4 rounded-md bg-white/70 p-4 text-black">
            <p className="text-sm text-gray-500">Ticket code</p>
            <p className="font-mono text-xl font-semibold">
              {result.ticket_code}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-black px-5 py-3 font-medium text-white"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}