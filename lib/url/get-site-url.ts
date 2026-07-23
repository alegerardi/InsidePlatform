const LOCAL_SITE_URL = "http://localhost:3000";

function isProductionDeployment() {
  return process.env.VERCEL_ENV === "production";
}

function isLocalhostUrl(url: URL) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

export function getSiteUrl() {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl && isProductionDeployment()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL in production. Set it to your real production domain."
    );
  }

  const siteUrl = configuredSiteUrl || LOCAL_SITE_URL;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(siteUrl);
  } catch {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL environment variable. Expected a full URL like http://localhost:3000 or https://your-domain.com."
    );
  }

  if (isProductionDeployment() && isLocalhostUrl(parsedUrl)) {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL in production. Production must not use localhost."
    );
  }

  if (isProductionDeployment() && parsedUrl.protocol !== "https:") {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL in production. Production must use HTTPS."
    );
  }

  return parsedUrl.origin;
}