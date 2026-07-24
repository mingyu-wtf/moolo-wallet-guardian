"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { sanitizePersistedWalletState } from "@/lib/persistence";
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
    try {
      const value = localStorage.getItem(name);
      if (value) JSON.parse(value);
      return value;
    } catch {
      localStorage.removeItem(name);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // The demo remains usable in memory when storage is unavailable.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
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
      resetDemo: () => {
        safeBrowserStorage.removeItem("moolo-wallet");
        set({ ...createInitialWalletData(), hasHydrated: true });
      },
    }),
    {
      name: "moolo-wallet",
      version: 3,
      storage: createJSONStorage(() => safeBrowserStorage),
      skipHydration: true,
      migrate: (persistedState) =>
        sanitizePersistedWalletState(persistedState),
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
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedWalletState(persisted),
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
