"use client";

import { create } from "zustand";
import { getMooloBrowserStorage } from "@/lib/moolo-storage";
import {
  readStoredLocale,
  writeStoredLocale,
} from "@/lib/i18n/locale-storage";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/types";

interface LocaleState {
  locale: Locale;
  hasHydratedLocale: boolean;
  setLocale: (locale: unknown) => void;
  hydrateLocale: () => void;
}

function applyDocumentLocale(locale: Locale): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: DEFAULT_LOCALE,
  hasHydratedLocale: false,
  setLocale: (value) => {
    const locale = normalizeLocale(value);
    applyDocumentLocale(locale);
    writeStoredLocale(getMooloBrowserStorage("local"), locale);
    set({ locale, hasHydratedLocale: true });
  },
  hydrateLocale: () => {
    const locale = readStoredLocale(getMooloBrowserStorage("local"));
    applyDocumentLocale(locale);
    set({ locale, hasHydratedLocale: true });
  },
}));

export function hydrateLocaleStore(): void {
  useLocaleStore.getState().hydrateLocale();
}
