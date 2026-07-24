import {
  ADDRESSES,
  DEFAULT_BALANCES,
  DEFAULT_SETTINGS,
  INITIAL_ACTIVITY,
} from "@/lib/constants";
import { transitionRialoTransaction } from "@/lib/rialo";
import type {
  DemoScenario,
  DemoTransaction,
  PendingTransfer,
  RecoveryProcess,
  SecuritySettings,
  WalletBalance,
  WalletProtectionState,
} from "@/types";

export interface WalletDataState {
  screen: "welcome" | "unlock" | "wallet";
  view: "tokens" | "activity" | "shield" | "send";
  balances: WalletBalance;
  settings: SecuritySettings;
  protectionState: WalletProtectionState;
  walletAddress: string;
  activity: DemoTransaction[];
  pendingTransfer: PendingTransfer | null;
  recovery: RecoveryProcess | null;
  settledTransactionIds: string[];
  activeScenario: DemoScenario | null;
}

const terminalStatuses = new Set<DemoTransaction["status"]>([
  "Confirmed",
  "Blocked",
  "Cancelled",
  "Agent Denied",
  "Frozen",
  "Recovered",
]);

export function createInitialWalletData(): WalletDataState {
  return {
    screen: "welcome",
    view: "tokens",
    balances: { ...DEFAULT_BALANCES },
    settings: { ...DEFAULT_SETTINGS },
    protectionState: "Protected",
    walletAddress: ADDRESSES.user,
    activity: INITIAL_ACTIVITY.map((transaction) => ({
      ...transaction,
      reasons: [...transaction.reasons],
      policies: [...transaction.policies],
    })),
    pendingTransfer: null,
    recovery: null,
    settledTransactionIds: [],
    activeScenario: null,
  };
}

function addSettledId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids : [id, ...ids].slice(0, 250);
}

export function upsertActivity(
  activity: DemoTransaction[],
  transaction: DemoTransaction,
  status: DemoTransaction["status"] = transaction.status,
): DemoTransaction[] {
  const existing = activity.find((item) => item.id === transaction.id);
  const transitioned = transitionRialoTransaction(transaction, status);
  const updated = {
    ...(existing ?? transitioned),
    ...transitioned,
    createdAt: existing?.createdAt ?? transaction.createdAt,
  };
  return [updated, ...activity.filter((item) => item.id !== transaction.id)];
}

export function recordActivityState(
  state: WalletDataState,
  transaction: DemoTransaction,
): WalletDataState {
  const alreadyRecorded = state.activity.some(
    (item) =>
      item.id === transaction.id &&
      item.status === transaction.status &&
      item.hash === transaction.hash,
  );
  if (alreadyRecorded) return state;
  return {
    ...state,
    activity: upsertActivity(state.activity, transaction),
    settledTransactionIds: terminalStatuses.has(transaction.status)
      ? addSettledId(state.settledTransactionIds, transaction.id)
      : state.settledTransactionIds,
  };
}

export function confirmTransactionState(
  state: WalletDataState,
  transaction: DemoTransaction,
): WalletDataState {
  const alreadyConfirmed =
    state.settledTransactionIds.includes(transaction.id) ||
    state.activity.some(
      (item) => item.id === transaction.id && item.status === "Confirmed",
    );
  if (alreadyConfirmed) {
    return state.pendingTransfer?.transaction.id === transaction.id
      ? { ...state, pendingTransfer: null }
      : state;
  }
  if (transaction.amount > state.balances[transaction.token]) return state;

  return {
    ...state,
    balances: {
      ...state.balances,
      [transaction.token]:
        state.balances[transaction.token] - transaction.amount,
    },
    activity: upsertActivity(state.activity, transaction, "Confirmed"),
    pendingTransfer:
      state.pendingTransfer?.transaction.id === transaction.id
        ? null
        : state.pendingTransfer,
    settledTransactionIds: addSettledId(
      state.settledTransactionIds,
      transaction.id,
    ),
  };
}

export function startTimeLockState(
  state: WalletDataState,
  transaction: DemoTransaction,
  now: number,
): WalletDataState {
  if (
    state.protectionState !== "Protected" ||
    state.pendingTransfer ||
    transaction.amount > state.balances[transaction.token] ||
    state.settledTransactionIds.includes(transaction.id)
  ) {
    return state;
  }
  const timelocked = transitionRialoTransaction(transaction, "Timelocked");
  return {
    ...state,
    pendingTransfer: {
      transaction: timelocked,
      startedAt: now,
      endsAt: now + state.settings.timeLockSeconds * 1_000,
    },
    activity: upsertActivity(state.activity, timelocked),
  };
}

export function requestGuardianState(state: WalletDataState): WalletDataState {
  if (
    !state.pendingTransfer ||
    state.settledTransactionIds.includes(
      state.pendingTransfer.transaction.id,
    )
  ) {
    return state;
  }
  const awaiting = transitionRialoTransaction(
    state.pendingTransfer.transaction,
    "Awaiting Guardian",
  );
  return {
    ...state,
    pendingTransfer: {
      ...state.pendingTransfer,
      transaction: awaiting,
    },
    activity: upsertActivity(state.activity, awaiting),
  };
}

export function cancelPendingState(state: WalletDataState): WalletDataState {
  if (!state.pendingTransfer) return state;
  const transaction = state.pendingTransfer.transaction;
  if (state.settledTransactionIds.includes(transaction.id)) {
    return { ...state, pendingTransfer: null };
  }
  return {
    ...state,
    pendingTransfer: null,
    activity: upsertActivity(state.activity, transaction, "Cancelled"),
    settledTransactionIds: addSettledId(
      state.settledTransactionIds,
      transaction.id,
    ),
  };
}

export function completeTimeLockState(
  state: WalletDataState,
  now: number,
): WalletDataState {
  const pending = state.pendingTransfer;
  if (
    !pending ||
    pending.transaction.status !== "Timelocked" ||
    now < pending.endsAt
  ) {
    return state;
  }
  return confirmTransactionState(state, pending.transaction);
}

export function freezeWalletState(
  state: WalletDataState,
  transaction: DemoTransaction,
): WalletDataState {
  if (state.protectionState === "Frozen") return state;
  const withoutPending = cancelPendingState(state);
  const frozen = transitionRialoTransaction(transaction, "Frozen");
  return {
    ...withoutPending,
    view: withoutPending.view === "send" ? "tokens" : withoutPending.view,
    protectionState: "Frozen",
    activity: upsertActivity(withoutPending.activity, frozen),
    settledTransactionIds: addSettledId(
      withoutPending.settledTransactionIds,
      frozen.id,
    ),
  };
}

export function beginRecoveryState(
  state: WalletDataState,
  transaction: DemoTransaction,
  now: number,
): WalletDataState {
  if (state.protectionState === "Recovering" && state.recovery) return state;
  if (state.protectionState !== "Frozen") return state;
  return {
    ...state,
    protectionState: "Recovering",
    recovery: { transaction, startedAt: now },
  };
}

export function completeRecoveryState(state: WalletDataState): WalletDataState {
  if (!state.recovery || state.protectionState !== "Recovering") return state;
  const transaction = state.recovery.transaction;
  if (state.settledTransactionIds.includes(transaction.id)) {
    return {
      ...state,
      protectionState: "Protected",
      walletAddress: ADDRESSES.recovered,
      recovery: null,
    };
  }
  return {
    ...state,
    protectionState: "Protected",
    walletAddress: ADDRESSES.recovered,
    recovery: null,
    activity: upsertActivity(state.activity, transaction, "Recovered"),
    settledTransactionIds: addSettledId(
      state.settledTransactionIds,
      transaction.id,
    ),
  };
}
