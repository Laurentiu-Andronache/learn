export function localizedField(
  item: Record<string, unknown>,
  field: string,
  locale: "en" | "es",
): string {
  const localized = item[`${field}_${locale}`];
  if (typeof localized === "string" && localized) return localized;
  const fallback = item[`${field}_${locale === "es" ? "en" : "es"}`];
  return typeof fallback === "string" ? fallback : "";
}
