export function sanitizeNextPath(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}