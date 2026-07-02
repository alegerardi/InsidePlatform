import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="mb-4 rounded-full border px-4 py-1 text-sm text-gray-600">
        MVP in development
      </p>

      <h1 className="max-w-3xl text-4xl font-bold tracking-tight">
        Role-based event ticket and QR authentication platform.
      </h1>

      <p className="mt-4 max-w-2xl text-gray-600">
        Create events, issue tickets, generate QR codes, and validate access at
        the entrance with role-based dashboards.
      </p>

      <div className="mt-8 flex gap-4">
        <Link href="/signup" className="rounded-md bg-black px-5 py-3 font-medium text-white">
          Get started
        </Link>

        <Link href="/login" className="rounded-md border px-5 py-3 font-medium">
          Log in
        </Link>
      </div>
    </main>
  );
}