export const MOOLO_STORAGE_PREFIX = "moolo";

export const MOOLO_STORAGE_KEYS = {
  wallet: "moolo-wallet",
  soundPreference: "moolo-sound-enabled",
  guidedNarration: "moolo-guided-narration",
  locale: "moolo-locale",
  errorRetryCount: "moolo-error-retry-count",
} as const;

export const MOOLO_RESET_EVENT = "moolo:reset";

export interface MooloStorageClearResult {
  localRemoved: string[];
  sessionRemoved: string[];
  preserved: string[];
  storageAvailable: boolean;
}

export interface StorageLike {
  readonly length: number;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export function getMooloBrowserStorage(
  kind: "local" | "session",
): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function clearMooloStorageArea(
  storage: StorageLike,
  preserveValidSoundPreference = false,
): { removed: string[]; preserved: string[] } {
  const removed: string[] = [];
  const preserved: string[] = [];
  const keys: string[] = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(MOOLO_STORAGE_PREFIX)) keys.push(key);
    }
  } catch {
    return { removed, preserved };
  }

  for (const key of keys) {
    if (preserveValidSoundPreference && key === MOOLO_STORAGE_KEYS.locale) {
      try {
        const value = storage.getItem(key);
        if (value === "ko" || value === "en") {
          preserved.push(key);
          continue;
        }
      } catch {
        // An unreadable locale is removed with the other Moolo state.
      }
    }

    if (
      preserveValidSoundPreference &&
      key === MOOLO_STORAGE_KEYS.soundPreference
    ) {
      try {
        const value = storage.getItem(key);
        if (value === "true" || value === "false") {
          preserved.push(key);
          continue;
        }
      } catch {
        // An unreadable preference is removed with the other Moolo state.
      }
    }

    if (
      preserveValidSoundPreference &&
      key === MOOLO_STORAGE_KEYS.guidedNarration
    ) {
      try {
        const value = storage.getItem(key);
        if (value === "on" || value === "off") {
          preserved.push(key);
          continue;
        }
      } catch {
        // An unreadable narration preference is removed with the demo state.
      }
    }

    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      // Storage can be blocked. The in-memory reset still keeps the demo safe.
    }
  }

  return { removed, preserved };
}

export function clearMooloStoredState(): MooloStorageClearResult {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MOOLO_RESET_EVENT));
  }
  const local = getMooloBrowserStorage("local");
  const session = getMooloBrowserStorage("session");
  const localResult = local
    ? clearMooloStorageArea(local, true)
    : { removed: [], preserved: [] };
  const sessionResult = session
    ? clearMooloStorageArea(session)
    : { removed: [], preserved: [] };

  return {
    localRemoved: localResult.removed,
    sessionRemoved: sessionResult.removed,
    preserved: localResult.preserved,
    storageAvailable: Boolean(local || session),
  };
}
