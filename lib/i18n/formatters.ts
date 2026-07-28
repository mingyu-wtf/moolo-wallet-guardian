import { getIntlLocale, type Locale } from "@/lib/i18n/types";

export function formatLocaleNumber(
  locale: Locale,
  value: unknown,
  options?: Intl.NumberFormatOptions,
): string {
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(
    safeValue,
  );
}

export function formatLocaleCurrency(
  locale: Locale,
  value: unknown,
): string {
  return formatLocaleNumber(locale, value, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function formatLocaleDateTime(
  locale: Locale,
  value: unknown,
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(new Date(value).getTime())
  ) {
    return locale === "ko" ? "시간 정보 없음" : "Unknown time";
  }
  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return locale === "ko" ? "시간 정보 없음" : "Unknown time";
  }
}

export function formatLocaleTime(
  locale: Locale,
  value: unknown,
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(new Date(value).getTime())
  ) {
    return locale === "ko" ? "시간 정보 없음" : "Unknown time";
  }
  try {
    return new Intl.DateTimeFormat(getIntlLocale(locale), {
      hour: "2-digit",
      minute: "2-digit",
    }).format(value);
  } catch {
    return locale === "ko" ? "시간 정보 없음" : "Unknown time";
  }
}
