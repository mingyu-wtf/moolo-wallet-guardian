import {
  createInitialWalletData,
  type WalletDataState,
} from "@/lib/wallet-state";
import { createLegacyRialoWorkflow } from "@/lib/rialo";
import type {
  DemoScenario,
  DemoTransaction,
  RialoExecutionTrace,
  RialoPrimitive,
  RialoTraceStatus,
  RialoWorkflowSummary,
  RiskLevel,
  SecuritySettings,
  TokenSymbol,
  TransactionStatus,
} from "@/types";

const screens = new Set(["welcome", "unlock", "wallet"]);
const views = new Set(["tokens", "activity", "shield", "send"]);
const protectionStates = new Set(["Protected", "Frozen", "Recovering"]);
const tokens = new Set<TokenSymbol>(["ETH", "USDC", "RLO"]);
const riskLevels = new Set<RiskLevel>([
  "Low",
  "Medium",
  "High",
  "Critical",
]);
const statuses = new Set<TransactionStatus>([
  "Confirmed",
  "Blocked",
  "Timelocked",
  "Awaiting Guardian",
  "Cancelled",
  "Agent Denied",
  "Frozen",
  "Recovered",
]);
const scenarios = new Set<DemoScenario>([
  "normal",
  "large",
  "phishing",
  "contract",
  "agent",
  "compromise",
  "guardian",
]);
const rialoPrimitives = new Set<RialoPrimitive>([
  "reactive-transaction",
  "native-timer",
  "validator-attested-web-call",
  "private-policy",
]);
const rialoTraceStatuses = new Set<RialoTraceStatus>([
  "waiting",
  "evaluating",
  "triggered",
  "completed",
  "blocked",
  "skipped",
]);
const rialoDecisions = new Set<RialoWorkflowSummary["finalDecision"]>([
  "allow",
  "delay",
  "require-guardian",
  "deny",
  "freeze",
  "recover",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeNumber(
  value: unknown,
  fallback: number,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function safeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeSettings(
  value: unknown,
  fallback: SecuritySettings,
): SecuritySettings {
  if (!isRecord(value)) return { ...fallback };
  return {
    protectionEnabled: safeBoolean(
      value.protectionEnabled,
      fallback.protectionEnabled,
    ),
    largeTransferLimit: safeNumber(
      value.largeTransferLimit,
      fallback.largeTransferLimit,
      1,
      1_000_000,
    ),
    timeLockSeconds: safeNumber(
      value.timeLockSeconds,
      fallback.timeLockSeconds,
      5,
      3_600,
    ),
    guardianThreshold: safeNumber(
      value.guardianThreshold,
      fallback.guardianThreshold,
      1,
      1_000_000,
    ),
    aiAgentDailyLimit: safeNumber(
      value.aiAgentDailyLimit,
      fallback.aiAgentDailyLimit,
      1,
      1_000_000,
    ),
    blockSuspiciousAddresses: safeBoolean(
      value.blockSuspiciousAddresses,
      fallback.blockSuspiciousAddresses,
    ),
    protectNewAddresses: safeBoolean(
      value.protectNewAddresses,
      fallback.protectNewAddresses,
    ),
    emergencyFreeze: safeBoolean(
      value.emergencyFreeze,
      fallback.emergencyFreeze,
    ),
  };
}

function sanitizeRialoWorkflow(
  value: unknown,
): RialoWorkflowSummary | null {
  if (
    !isRecord(value) ||
    typeof value.workflowName !== "string" ||
    typeof value.predicateSummary !== "string" ||
    !rialoDecisions.has(
      value.finalDecision as RialoWorkflowSummary["finalDecision"],
    ) ||
    !Array.isArray(value.traces)
  ) {
    return null;
  }

  const traces = value.traces
    .map((trace): RialoExecutionTrace | null => {
      if (
        !isRecord(trace) ||
        typeof trace.id !== "string" ||
        !rialoPrimitives.has(trace.primitive as RialoPrimitive) ||
        typeof trace.title !== "string" ||
        typeof trace.description !== "string" ||
        !rialoTraceStatuses.has(trace.status as RialoTraceStatus) ||
        trace.simulated !== true ||
        typeof trace.createdAt !== "string"
      ) {
        return null;
      }
      return {
        id: trace.id,
        primitive: trace.primitive as RialoPrimitive,
        title: trace.title,
        description: trace.description,
        status: trace.status as RialoTraceStatus,
        simulated: true,
        trigger:
          typeof trace.trigger === "string" ? trace.trigger : undefined,
        inputSummary:
          typeof trace.inputSummary === "string"
            ? trace.inputSummary
            : undefined,
        resultSummary:
          typeof trace.resultSummary === "string"
            ? trace.resultSummary
            : undefined,
        createdAt: trace.createdAt,
      };
    })
    .filter((trace): trace is RialoExecutionTrace => trace !== null);

  if (traces.length === 0) return null;
  return {
    workflowName: value.workflowName,
    predicateSummary: value.predicateSummary,
    finalDecision:
      value.finalDecision as RialoWorkflowSummary["finalDecision"],
    traces,
  };
}

function sanitizeTransaction(value: unknown): DemoTransaction | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "string" ||
    typeof value.hash !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(value.hash) ||
    typeof value.type !== "string" ||
    typeof value.from !== "string" ||
    typeof value.to !== "string" ||
    !tokens.has(value.token as TokenSymbol) ||
    !statuses.has(value.status as TransactionStatus) ||
    !riskLevels.has(value.riskLevel as RiskLevel)
  ) {
    return null;
  }
  const transaction = {
    id: value.id,
    hash: value.hash,
    blockNumber: safeNumber(value.blockNumber, 0),
    fee: safeNumber(value.fee, 0),
    type: value.type,
    token: value.token as TokenSymbol,
    amount: safeNumber(value.amount, 0),
    from: value.from,
    to: value.to,
    status: value.status as TransactionStatus,
    riskScore: safeNumber(value.riskScore, 0, 0, 100),
    riskLevel: value.riskLevel as RiskLevel,
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter((item): item is string => typeof item === "string")
      : [],
    policies: Array.isArray(value.policies)
      ? value.policies.filter(
          (item): item is string => typeof item === "string",
        )
      : ["Spending policy", "Address reputation", "Reactive decision"],
    createdAt: safeNumber(value.createdAt, Date.now()),
  };
  return {
    ...transaction,
    rialoWorkflow:
      sanitizeRialoWorkflow(value.rialoWorkflow) ??
      createLegacyRialoWorkflow(transaction),
  };
}

export function sanitizePersistedWalletState(
  value: unknown,
): WalletDataState {
  const fallback = createInitialWalletData();
  if (!isRecord(value)) return fallback;

  const rawActivity = Array.isArray(value.activity)
    ? value.activity.map(sanitizeTransaction).filter(Boolean)
    : fallback.activity;
  const seen = new Set<string>();
  const activity = (rawActivity as DemoTransaction[]).filter((transaction) => {
    if (seen.has(transaction.id)) return false;
    seen.add(transaction.id);
    return true;
  });

  const pendingValue = isRecord(value.pendingTransfer)
    ? value.pendingTransfer
    : null;
  const pendingTransaction = pendingValue
    ? sanitizeTransaction(pendingValue.transaction)
    : null;
  const pendingTransfer =
    pendingValue &&
    pendingTransaction &&
    (pendingTransaction.status === "Timelocked" ||
      pendingTransaction.status === "Awaiting Guardian")
      ? {
          transaction: pendingTransaction,
          startedAt: safeNumber(
            pendingValue.startedAt,
            Date.now(),
          ),
          endsAt: safeNumber(pendingValue.endsAt, Date.now()),
        }
      : null;

  const recoveryValue = isRecord(value.recovery) ? value.recovery : null;
  const recoveryTransaction = recoveryValue
    ? sanitizeTransaction(recoveryValue.transaction)
    : null;
  const recovery =
    recoveryValue && recoveryTransaction
      ? {
          transaction: recoveryTransaction,
          startedAt: safeNumber(recoveryValue.startedAt, Date.now()),
        }
      : null;

  const protectionState = protectionStates.has(
    value.protectionState as string,
  )
    ? (value.protectionState as WalletDataState["protectionState"])
    : fallback.protectionState;
  const requestedView = views.has(value.view as string)
    ? (value.view as WalletDataState["view"])
    : fallback.view;

  return {
    screen: screens.has(value.screen as string)
      ? (value.screen as WalletDataState["screen"])
      : fallback.screen,
    view:
      protectionState !== "Protected" && requestedView === "send"
        ? "tokens"
        : requestedView,
    balances: isRecord(value.balances)
      ? {
          ETH: safeNumber(value.balances.ETH, fallback.balances.ETH),
          USDC: safeNumber(value.balances.USDC, fallback.balances.USDC),
          RLO: safeNumber(value.balances.RLO, fallback.balances.RLO),
        }
      : fallback.balances,
    settings: sanitizeSettings(value.settings, fallback.settings),
    protectionState:
      protectionState === "Recovering" && !recovery
        ? "Frozen"
        : protectionState,
    walletAddress:
      typeof value.walletAddress === "string" &&
      /^0x[a-fA-F0-9]{40}$/.test(value.walletAddress)
        ? value.walletAddress
        : fallback.walletAddress,
    activity,
    pendingTransfer:
      protectionState === "Protected" ? pendingTransfer : null,
    recovery:
      protectionState === "Recovering" ? recovery : null,
    settledTransactionIds: Array.isArray(value.settledTransactionIds)
      ? value.settledTransactionIds.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    activeScenario: scenarios.has(value.activeScenario as DemoScenario)
      ? (value.activeScenario as DemoScenario)
      : null,
  };
}
