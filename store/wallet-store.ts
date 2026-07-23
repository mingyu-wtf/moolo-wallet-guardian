"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  ADDRESSES,
  DEFAULT_BALANCES,
  DEFAULT_SETTINGS,
  INITIAL_ACTIVITY,
} from "@/lib/constants";
import type {
  DemoTransaction,
  PendingTransfer,
  SecuritySettings,
  TokenSymbol,
  WalletBalance,
  WalletProtectionState,
} from "@/types";

export type WalletView = "tokens" | "activity" | "shield" | "send";

interface WalletState {
  hasHydrated: boolean;
  screen: "welcome" | "unlock" | "wallet";
  view: WalletView;
  balances: WalletBalance;
  settings: SecuritySettings;
  protectionState: WalletProtectionState;
  walletAddress: string;
  activity: DemoTransaction[];
  pendingTransfer: PendingTransfer | null;
  setHydrated: (hydrated: boolean) => void;
  enterDemo: () => void;
  unlock: () => void;
  setView: (view: WalletView) => void;
  updateSettings: (settings: Partial<SecuritySettings>) => void;
  addActivity: (transaction: DemoTransaction) => void;
  confirmTransaction: (transaction: DemoTransaction) => void;
  startTimeLock: (transaction: DemoTransaction) => void;
  setAwaitingGuardian: () => void;
  cancelPending: () => void;
  approvePending: () => void;
  completeTimeLock: () => void;
  freezeWallet: (transaction: DemoTransaction) => void;
  beginRecovery: () => void;
  completeRecovery: (transaction: DemoTransaction) => void;
  resetDemo: () => void;
}

const initialState = {
  hasHydrated: false,
  screen: "welcome" as const,
  view: "tokens" as const,
  balances: { ...DEFAULT_BALANCES },
  settings: { ...DEFAULT_SETTINGS },
  protectionState: "Protected" as const,
  walletAddress: ADDRESSES.user,
  activity: [...INITIAL_ACTIVITY],
  pendingTransfer: null,
};

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
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
};

function subtractBalance(
  balances: WalletBalance,
  token: TokenSymbol,
  amount: number,
): WalletBalance {
  return {
    ...balances,
    [token]: Math.max(0, balances[token] - amount),
  };
}

function withStatus(
  transaction: DemoTransaction,
  status: DemoTransaction["status"],
): DemoTransaction {
  return { ...transaction, status, createdAt: Date.now() };
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setHydrated: (hasHydrated) => set({ hasHydrated }),
      enterDemo: () => set({ screen: "unlock" }),
      unlock: () => set({ screen: "wallet" }),
      setView: (view) => set({ view }),
      updateSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),
      addActivity: (transaction) =>
        set((state) => ({ activity: [transaction, ...state.activity] })),
      confirmTransaction: (transaction) =>
        set((state) => ({
          balances: subtractBalance(
            state.balances,
            transaction.token,
            transaction.amount,
          ),
          activity: [withStatus(transaction, "Confirmed"), ...state.activity],
          pendingTransfer: null,
        })),
      startTimeLock: (transaction) =>
        set((state) => ({
          pendingTransfer: {
            transaction: withStatus(transaction, "Timelocked"),
            endsAt: Date.now() + state.settings.timeLockSeconds * 1000,
          },
          activity: [
            withStatus(transaction, "Timelocked"),
            ...state.activity,
          ],
        })),
      setAwaitingGuardian: () =>
        set((state) => {
          if (!state.pendingTransfer) return state;
          const updated = withStatus(
            state.pendingTransfer.transaction,
            "Awaiting Guardian",
          );
          return {
            pendingTransfer: {
              transaction: updated,
              endsAt: state.pendingTransfer.endsAt,
            },
            activity: [updated, ...state.activity],
          };
        }),
      cancelPending: () =>
        set((state) => {
          if (!state.pendingTransfer) return state;
          return {
            activity: [
              withStatus(state.pendingTransfer.transaction, "Cancelled"),
              ...state.activity,
            ],
            pendingTransfer: null,
          };
        }),
      approvePending: () => {
        const pending = get().pendingTransfer;
        if (pending) get().confirmTransaction(pending.transaction);
      },
      completeTimeLock: () => {
        const pending = get().pendingTransfer;
        if (pending && pending.transaction.status === "Timelocked") {
          get().confirmTransaction(pending.transaction);
        }
      },
      freezeWallet: (transaction) =>
        set((state) => ({
          protectionState: "Frozen",
          activity: [withStatus(transaction, "Frozen"), ...state.activity],
        })),
      beginRecovery: () => set({ protectionState: "Recovering" }),
      completeRecovery: (transaction) =>
        set((state) => ({
          protectionState: "Protected",
          walletAddress: ADDRESSES.recovered,
          activity: [withStatus(transaction, "Recovered"), ...state.activity],
        })),
      resetDemo: () => {
        localStorage.removeItem("moolo-wallet");
        set({ ...initialState, hasHydrated: true });
      },
    }),
    {
      name: "moolo-wallet",
      storage: createJSONStorage(() => safeBrowserStorage),
      skipHydration: true,
      partialize: (state) => ({
        screen: state.screen,
        view: state.view,
        balances: state.balances,
        settings: state.settings,
        protectionState: state.protectionState,
        walletAddress: state.walletAddress,
        activity: state.activity,
        pendingTransfer: state.pendingTransfer,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
