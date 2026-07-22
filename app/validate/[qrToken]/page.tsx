import Link from "next/link";

export default function SafeQrValidationPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl items-center px-6 py-12">
      <section className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] shadow-2xl shadow-black/30">
        <div className="border-b border-white/10 p-8 md:p-10">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/40">
            Ticket QR
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
            Staff validation required
          </h1>

          <p className="mt-5 text-base leading-8 text-white/60">
            This page does not validate tickets. To check in a guest, event
            staff must open validation mode from the staff dashboard and scan
            the ticket QR code there.
          </p>
        </div>

        <div className="grid gap-4 p-8 md:p-10">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="font-semibold text-white">Why this changed</p>

            <p className="mt-2 text-sm leading-6 text-white/50">
              Opening a QR link in a browser should never perform a check-in.
              Ticket validation is now handled only through the secure staff
              scanner flow.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex w-fit rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:opacity-85"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}