export function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const parsedUrl = new URL(siteUrl);

    return parsedUrl.origin;
  } catch {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL environment variable. Expected a full URL like http://localhost:3000 or https://your-domain.com."
    );
  }
}