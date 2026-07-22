"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sanitizeNextPath } from "../auth/sanitize-next-path";
import { createClient } from "../supabase/server";
import { getSiteUrl } from "../url/get-site-url";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function buildRedirectPath(
  pathname: string,
  params: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const queryString = searchParams.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

function redirectToLoginWithError(message: string, nextPath: string): never {
  redirect(
    buildRedirectPath("/login", {
      error: message,
      next: nextPath,
    })
  );
}

function redirectToSignupWithError(message: string, nextPath: string): never {
  redirect(
    buildRedirectPath("/signup", {
      error: message,
      next: nextPath,
    })
  );
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const fullName = getString(formData, "full_name");
  const nextPath = sanitizeNextPath(getString(formData, "next") || "/dashboard");

  if (!email) {
    redirectToSignupWithError("Email is required.", nextPath);
  }

  if (!password) {
    redirectToSignupWithError("Password is required.", nextPath);
  }

  const siteUrl = getSiteUrl();
  const emailRedirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(
    nextPath
  )}`;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    redirectToSignupWithError(error.message, nextPath);
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect(nextPath);
  }

  redirect(
    buildRedirectPath("/login", {
      message: "Account created. Check your email to confirm your account.",
      next: nextPath,
    })
  );
}

export async function signInAction(formData: FormData) {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");
  const nextPath = sanitizeNextPath(getString(formData, "next") || "/dashboard");

  if (!email) {
    redirectToLoginWithError("Email is required.", nextPath);
  }

  if (!password) {
    redirectToLoginWithError("Password is required.", nextPath);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectToLoginWithError("Invalid email or password.", nextPath);
  }

  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}