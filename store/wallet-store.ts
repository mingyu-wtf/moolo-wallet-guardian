"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { updateWalletHydrationDiagnostics } from "@/lib/hydration-diagnostics";
import {
  clearMooloStoredState,
  getMooloBrowserStorage,
} from "@/lib/moolo-storage";
import {
  normalizePersistedWalletEnvelope,
  sanitizePersistedWalletState,
  WALLET_STORAGE_KEY,
  WALLET_STORAGE_VERSION,
} from "@/lib/persistence";
import {
  beginRecoveryState,
  cancelPendingState,
  completeRecoveryState,
  completeTimeLockState,
  confirmTransactionState,
  createInitialWalletData,
  freezeWalletState,
  recordActivityState,
  requestGuardianState,
  startTimeLockState,
  type WalletDataState,
} from "@/lib/wallet-state";
import type {
  DemoScenario,
  DemoTransaction,
  SecuritySettings,
} from "@/types";
import { resetGuidedDemoState } from "@/store/guided-demo-store";

export type WalletView = WalletDataState["view"];

interface WalletActions {
  hasHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  enterDemo: () => void;
  unlock: () => void;
  setView: (view: WalletView) => void;
  setActiveScenario: (scenario: DemoScenario | null) => void;
  updateSettings: (settings: Partial<SecuritySettings>) => void;
  addActivity: (transaction: DemoTransaction) => void;
  confirmTransaction: (transaction: DemoTransaction) => void;
  startTimeLock: (transaction: DemoTransaction) => boolean;
  setAwaitingGuardian: () => void;
  cancelPending: () => void;
  approvePending: () => void;
  completeTimeLock: () => void;
  freezeWallet: (transaction: DemoTransaction) => void;
  beginRecovery: (transaction: DemoTransaction) => void;
  completeRecovery: () => void;
  resetDemo: () => void;
}

export type WalletState = WalletDataState & WalletActions;

const safeBrowserStorage: StateStorage = {
  getItem: (name) => {
    updateWalletHydrationDiagnostics({
      phase: "reading-storage",
      storageRead: true,
    });
    const storage = getMooloBrowserStorage("local");
    if (!storage) {
      updateWalletHydrationDiagnostics({
        phase: "recovering",
        recoveryReason: "Local Storage is unavailable",
      });
      return null;
    }

    try {
      const value = storage.getItem(name);
      if (!value) return null;

      updateWalletHydrationDiagnostics({ phase: "parsing-storage" });
      const parsed = JSON.parse(value);
      updateWalletHydrationDiagnostics({ phase: "normalizing-storage" });
      const normalized = normalizePersistedWalletEnvelope(parsed);
      return JSON.stringify(normalized);
    } catch (error) {
      updateWalletHydrationDiagnostics({
        phase: "recovering",
        storageParseFailed: true,
        recoveryReason:
          error instanceof Error ? error.message : "Storage parsing failed",
      });
      try {
        storage.removeItem(name);
      } catch {
        // A blocked storage area is treated like unavailable persistence.
      }
      return null;
    }
  },
  setItem: (name, value) => {
    const storage = getMooloBrowserStorage("local");
    if (!storage) return;
    try {
      storage.setItem(name, value);
    } catch {
      // The demo remains usable in memory when storage is unavailable.
    }
  },
  removeItem: (name) => {
    const storage = getMooloBrowserStorage("local");
    if (!storage) return;
    try {
      storage.removeItem(name);
    } catch {
      // Nothing else is required for an in-memory reset.
    }
  },
};

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...createInitialWalletData(),
      hasHydrated: false,
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      enterDemo: () => set({ screen: "unlock" }),
      unlock: () => set({ screen: "wallet" }),
      setView: (view) =>
        set((state) => ({
          view:
            view === "send" && state.protectionState !== "Protected"
              ? state.view
              : view,
        })),
      setActiveScenario: (activeScenario) => set({ activeScenario }),
      updateSettings: (settings) =>
        set((state) => ({
          settings: sanitizePersistedWalletState({
            ...state,
            settings: { ...state.settings, ...settings },
          }).settings,
        })),
      addActivity: (transaction) =>
        set((state) => recordActivityState(state, transaction)),
      confirmTransaction: (transaction) =>
        set((state) => confirmTransactionState(state, transaction)),
      startTimeLock: (transaction) => {
        const previous = get();
        const next = startTimeLockState(previous, transaction, Date.now());
        if (next === previous) return false;
        set(next);
        return true;
      },
      setAwaitingGuardian: () =>
        set((state) => requestGuardianState(state)),
      cancelPending: () => set((state) => cancelPendingState(state)),
      approvePending: () =>
        set((state) =>
          state.pendingTransfer
            ? confirmTransactionState(state, state.pendingTransfer.transaction)
            : state,
        ),
      completeTimeLock: () =>
        set((state) => completeTimeLockState(state, Date.now())),
      freezeWallet: (transaction) =>
        set((state) => freezeWalletState(state, transaction)),
      beginRecovery: (transaction) =>
        set((state) => beginRecoveryState(state, transaction, Date.now())),
      completeRecovery: () =>
        set((state) => completeRecoveryState(state)),
      resetDemo: () => resetMooloDemoState(),
    }),
    {
      name: WALLET_STORAGE_KEY,
      version: WALLET_STORAGE_VERSION,
      storage: createJSONStorage(() => safeBrowserStorage),
      skipHydration: true,
      migrate: (persistedState) => {
        updateWalletHydrationDiagnostics({
          phase: "migrating",
          migrationStarted: true,
        });
        try {
          return sanitizePersistedWalletState(persistedState);
        } catch (error) {
          updateWalletHydrationDiagnostics({
            phase: "recovering",
            migrationFailed: true,
            recoveryReason:
              error instanceof Error ? error.message : "Migration failed",
          });
          return createInitialWalletData();
        }
      },
      partialize: (state) => ({
        screen: state.screen,
        view: state.view,
        balances: state.balances,
        settings: state.settings,
        protectionState: state.protectionState,
        walletAddress: state.walletAddress,
        activity: state.activity,
        pendingTransfer: state.pendingTransfer,
        recovery: state.recovery,
        settledTransactionIds: state.settledTransactionIds,
        activeScenario: state.activeScenario,
      }),
      merge: (persisted, current) => {
        updateWalletHydrationDiagnostics({
          phase: "merging",
          mergeStarted: true,
        });
        return {
          ...current,
          ...sanitizePersistedWalletState(persisted),
        };
      },
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          updateWalletHydrationDiagnostics({
            phase: "recovering",
            recoveryReason:
              error instanceof Error ? error.message : "Hydration failed",
          });
          recoverWalletStore("Hydration callback failed");
          return;
        }

        state.setHydrated(true);
        updateWalletHydrationDiagnostics({
          phase: "hydrated",
          hasHydrated: true,
        });
      },
    },
  ),
);

function recoverWalletStore(reason: string): void {
  updateWalletHydrationDiagnostics({
    phase: "recovering",
    recoveryReason: reason,
  });
  safeBrowserStorage.removeItem(WALLET_STORAGE_KEY);
  useWalletStore.setState({
    ...createInitialWalletData(),
    hasHydrated: true,
  });
}

export async function hydrateWalletStore(): Promise<void> {
  updateWalletHydrationDiagnostics({
    phase: "rehydrating",
    hasHydrated: false,
    storageRead: false,
    storageParseFailed: false,
    migrationStarted: false,
    migrationFailed: false,
    mergeStarted: false,
    recoveryReason: null,
  });
  try {
    await useWalletStore.persist.rehydrate();
  } catch (error) {
    updateWalletHydrationDiagnostics({
      phase: "recovering",
      recoveryReason:
        error instanceof Error ? error.message : "Hydration threw",
    });
    recoverWalletStore(
      error instanceof Error ? error.message : "Hydration threw",
    );
  }

  if (!useWalletStore.getState().hasHydrated) {
    useWalletStore.setState({ hasHydrated: true });
  }

  updateWalletHydrationDiagnostics({
    phase: "hydrated",
    hasHydrated: true,
  });
}

export function forceWalletHydrationFallback(reason: string): void {
  if (useWalletStore.getState().hasHydrated) return;
  recoverWalletStore(reason);
}

export function resetMooloDemoState(): void {
  resetGuidedDemoState();
  clearMooloStoredState();
  useWalletStore.setState({
    ...createInitialWalletData(),
    hasHydrated: true,
  });
  useWalletStore.persist.clearStorage();
  safeBrowserStorage.removeItem(WALLET_STORAGE_KEY);
  updateWalletHydrationDiagnostics({
    phase: "hydrated",
    hasHydrated: true,
    recoveryReason: "Demo reset",
  });
}
