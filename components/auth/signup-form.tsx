import { signUpAction } from "../../lib/actions/auth";

type SignupFormProps = {
  nextPath: string;
  error?: string;
};

export function SignupForm({ nextPath, error }: SignupFormProps) {
  return (
    <form action={signUpAction} className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />

      <div className="flex flex-col gap-2">
        <label htmlFor="full_name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          className="rounded-md border px-3 py-2"
          placeholder="Alessandro Gerardi Filho"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border px-3 py-2"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="rounded-md border px-3 py-2"
          placeholder="At least 6 characters"
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 font-medium text-white"
      >
        Create account
      </button>
    </form>
  );
}