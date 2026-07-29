export type Locale = "ko" | "en";

export const DEFAULT_LOCALE: Locale = "ko";

export const SUPPORTED_LOCALES: readonly Locale[] = ["ko", "en"];

export function normalizeLocale(value: unknown): Locale {
  return value === "en" || value === "ko" ? value : DEFAULT_LOCALE;
}

export function getIntlLocale(locale: Locale): "ko-KR" | "en-US" {
  return locale === "ko" ? "ko-KR" : "en-US";
}
