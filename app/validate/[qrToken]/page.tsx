import { requireUser } from "../../../lib/auth/require-user";

type ValidateTicketPageProps = {
  params: Promise<{
    qrToken: string;
  }>;
};

export default async function ValidateTicketPage({
  params,
}: ValidateTicketPageProps) {
  await requireUser("/dashboard");

  const { qrToken } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-lg border p-8">
        <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
          Ticket validation
        </p>

        <h1 className="mt-3 text-3xl font-bold">Validation page placeholder</h1>

        <p className="mt-4 text-gray-600">
          This QR token was received correctly. In the next layer, this page will
          check whether the staff user is authorized for the event and then mark
          the ticket as used.
        </p>

        <p className="mt-4 break-all rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-700">
          {qrToken}
        </p>
      </div>
    </main>
  );
}