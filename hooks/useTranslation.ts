"use client";

import { useCallback } from "react";
import {
  translateKnownText,
  translateText,
  type TranslationKey,
} from "@/lib/i18n/dictionaries";
import {
  formatLocaleCurrency,
  formatLocaleDateTime,
  formatLocaleNumber,
  formatLocaleTime,
} from "@/lib/i18n/formatters";
import { useLocaleStore } from "@/store/locale-store";

export function useTranslation() {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const t = useCallback(
    (
      key: TranslationKey,
      values?: Record<string, string | number>,
    ) => translateText(locale, key, values),
    [locale],
  );
  const tx = useCallback(
    (value: string) => translateKnownText(locale, value),
    [locale],
  );
  const number = useCallback(
    (value: unknown, options?: Intl.NumberFormatOptions) =>
      formatLocaleNumber(locale, value, options),
    [locale],
  );
  const currency = useCallback(
    (value: unknown) => formatLocaleCurrency(locale, value),
    [locale],
  );
  const dateTime = useCallback(
    (value: unknown) => formatLocaleDateTime(locale, value),
    [locale],
  );
  const time = useCallback(
    (value: unknown) => formatLocaleTime(locale, value),
    [locale],
  );

  return {
    locale,
    setLocale,
    t,
    tx,
    formatNumber: number,
    formatCurrency: currency,
    formatDateTime: dateTime,
    formatTime: time,
  };
}
