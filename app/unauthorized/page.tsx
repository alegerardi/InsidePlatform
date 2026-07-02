import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl flex-col items-center justify-center px-6 py-12 text-center">
      <h1 className="text-3xl font-bold">Unauthorized</h1>
      <p className="mt-3 max-w-md text-gray-600">
        You do not have permission to access this page.
      </p>

      <Link href="/dashboard" className="mt-6 rounded-md bg-black px-4 py-2 text-white">
        Go to dashboard
      </Link>
    </main>
  );
}