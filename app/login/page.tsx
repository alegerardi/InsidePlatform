import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "../../components/auth/login-form";
import { getUser } from "../../lib/auth/get-user";
import { sanitizeNextPath } from "../../lib/auth/sanitize-next-path";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const nextPath = sanitizeNextPath(params?.next ?? "/dashboard");

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-5xl flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Log in</h1>
        <p className="mt-2 text-gray-600">
          Access your dashboard and tickets.
        </p>
      </div>

      <LoginForm nextPath={nextPath} error={params?.error} />

      <p className="mt-6 text-sm text-gray-600">
        Do not have an account?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          className="font-medium underline"
        >
          Sign up
        </Link>
      </p>
    </main>
  );
}