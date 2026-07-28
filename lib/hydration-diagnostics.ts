export type WalletHydrationPhase =
  | "idle"
  | "rehydrating"
  | "reading-storage"
  | "parsing-storage"
  | "normalizing-storage"
  | "migrating"
  | "merging"
  | "hydrated"
  | "recovering";

export interface WalletHydrationDiagnostics {
  phase: WalletHydrationPhase;
  hasHydrated: boolean;
  storageRead: boolean;
  storageParseFailed: boolean;
  migrationStarted: boolean;
  migrationFailed: boolean;
  mergeStarted: boolean;
  recoveryReason: string | null;
}

const diagnostics: WalletHydrationDiagnostics = {
  phase: "idle",
  hasHydrated: false,
  storageRead: false,
  storageParseFailed: false,
  migrationStarted: false,
  migrationFailed: false,
  mergeStarted: false,
  recoveryReason: null,
};

export function updateWalletHydrationDiagnostics(
  update: Partial<WalletHydrationDiagnostics>,
): void {
  Object.assign(diagnostics, update);
}

export function getWalletHydrationDiagnostics(): WalletHydrationDiagnostics {
  return { ...diagnostics };
}
