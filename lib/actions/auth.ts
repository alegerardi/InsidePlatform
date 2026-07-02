"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { sanitizeNextPath } from "../auth/sanitize-next-path";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  const fullName = getString(formData, "full_name");
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const next = sanitizeNextPath(formData.get("next"));

  if (!fullName || !email || !password) {
    redirectWithError(`/signup?next=${encodeURIComponent(next)}`, "Fill all fields.");
  }

  if (password.length < 6) {
    redirectWithError(
      `/signup?next=${encodeURIComponent(next)}`,
      "Password must have at least 6 characters."
    );
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    redirectWithError(`/signup?next=${encodeURIComponent(next)}`, error.message);
  }

  redirect(next);
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const next = sanitizeNextPath(formData.get("next"));

  if (!email || !password) {
    redirectWithError(`/login?next=${encodeURIComponent(next)}`, "Fill all fields.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError(
      `/login?next=${encodeURIComponent(next)}`,
      "Invalid email or password."
    );
  }

  redirect(next);
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}