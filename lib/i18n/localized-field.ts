export function localizedField(
  // biome-ignore lint/suspicious/noExplicitAny: accepts any object with locale-suffixed fields
  item: Record<string, any>,
  field: string,
  locale: "en" | "es",
): string {
  const localized = item[`${field}_${locale}`];
  if (typeof localized === "string" && localized) return localized;
  const fallback = item[`${field}_${locale === "es" ? "en" : "es"}`];
  return typeof fallback === "string" ? fallback : "";
}
