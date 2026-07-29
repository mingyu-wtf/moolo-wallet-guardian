import { MOOLO_STORAGE_KEYS, type StorageLike } from "@/lib/moolo-storage";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/types";

export function readStoredLocale(storage: StorageLike | null): Locale {
  if (!storage) return DEFAULT_LOCALE;
  try {
    return normalizeLocale(storage.getItem(MOOLO_STORAGE_KEYS.locale));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function writeStoredLocale(
  storage: StorageLike | null,
  locale: Locale,
): void {
  if (!storage) return;
  try {
    storage.setItem(MOOLO_STORAGE_KEYS.locale, locale);
  } catch {
    // Locale remains available in memory when storage is blocked.
  }
}
