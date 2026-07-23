import type { ScanResult } from "./qr-scanner-types";

export function extractQrToken(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split("/").filter(Boolean);
    const validateIndex = parts.indexOf("validate");

    if (validateIndex >= 0 && parts[validateIndex + 1]) {
      return parts[validateIndex + 1];
    }
  } catch {
    // The scanned value may already be a raw token or a path.
  }

  const parts = trimmedValue.split("/").filter(Boolean);
  const validateIndex = parts.indexOf("validate");

  if (validateIndex >= 0 && parts[validateIndex + 1]) {
    return parts[validateIndex + 1];
  }

  return trimmedValue;
}

export function formatPrice(priceCents: number, currency = "EUR") {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

export function getResultTitle(result: ScanResult) {
  if (result.success || result.result === "success") {
    return "Access approved";
  }

  if (result.result === "already_used") {
    return "Already checked in";
  }

  if (result.result === "wrong_event") {
    return "Wrong event";
  }

  if (result.result === "unauthorized") {
    return "Unauthorized";
  }

  return "Access not approved";
}

export function getTicketPrice(result: ScanResult) {
  return result.ticket_price_cents ?? result.price_cents ?? 0;
}

export function getTicketCurrency(result: ScanResult) {
  return result.ticket_currency ?? result.currency ?? "EUR";
}