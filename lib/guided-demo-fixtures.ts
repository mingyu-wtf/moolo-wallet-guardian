import { ADDRESSES } from "@/lib/constants";
import { createRialoWorkflow, type RialoWorkflowKind } from "@/lib/rialo";
import {
  beginRecoveryState,
  completeRecoveryState,
  confirmTransactionState,
  createInitialWalletData,
  freezeWalletState,
  recordActivityState,
  type WalletDataState,
} from "@/lib/wallet-state";
import {
  GUIDED_DEMO_STEPS,
  type GuidedDemoPhase,
} from "@/lib/guided-demo";
import type {
  DemoTransaction,
  RiskAssessment,
  TokenSymbol,
  TransactionStatus,
} from "@/types";

const GUIDED_DEMO_TIME = 1_735_689_600_000;

interface GuidedTransactionInput {
  id: string;
  hashCharacter: string;
  kind: RialoWorkflowKind;
  type: string;
  token: TokenSymbol;
  amount: number;
  to: string;
  status: TransactionStatus;
  assessment: RiskAssessment;
  policies: string[];
  offset: number;
}

function createGuidedTransaction(
  input: GuidedTransactionInput,
): DemoTransaction {
  const workflow = createRialoWorkflow({
    kind: input.kind,
    amount: input.amount,
    token: input.token,
    assessment: input.assessment,
  });
  return {
    id: input.id,
    hash: `0x${input.hashCharacter.repeat(64)}`,
    blockNumber: 21_806_000 + input.offset,
    fee: 0.0004,
    type: input.type,
    token: input.token,
    amount: input.amount,
    from: ADDRESSES.user,
    to: input.to,
    status: input.status,
    riskScore: input.assessment.score,
    riskLevel: input.assessment.level,
    reasons: [...input.assessment.reasons],
    policies: [...input.policies],
    rialoWorkflow: {
      ...workflow,
      traces: workflow.traces.map((trace, index) => ({
        ...trace,
        id: `${input.id}-trace-${index + 1}`,
        createdAt: new Date(GUIDED_DEMO_TIME + input.offset * 1_000).toISOString(),
      })),
    },
    createdAt: GUIDED_DEMO_TIME + input.offset * 60_000,
  };
}

function guidedTransactions() {
  return {
    normal: createGuidedTransaction({
      id: "guided-normal-transfer",
      hashCharacter: "1",
      kind: "normal",
      type: "Guided safe transfer",
      token: "USDC",
      amount: 125,
      to: ADDRESSES.trusted,
      status: "Confirmed",
      assessment: {
        score: 8,
        level: "Low",
        reasons: ["Previously trusted recipient", "Within spending policy"],
        decision: "allow",
      },
      policies: ["Trusted recipient", "Reactive decision"],
      offset: 1,
    }),
    large: createGuidedTransaction({
      id: "guided-large-transfer",
      hashCharacter: "2",
      kind: "large",
      type: "Guided large transfer",
      token: "USDC",
      amount: 8_500,
      to: ADDRESSES.new,
      status: "Timelocked",
      assessment: {
        score: 75,
        level: "High",
        reasons: [
          "New recipient",
          "Transfer exceeds the enhanced review threshold",
        ],
        decision: "timelock",
      },
      policies: ["Large transfer limit", "Native Timer"],
      offset: 2,
    }),
    phishing: createGuidedTransaction({
      id: "guided-phishing-block",
      hashCharacter: "3",
      kind: "phishing",
      type: "Guided phishing attempt",
      token: "USDC",
      amount: 420,
      to: ADDRESSES.phishing,
      status: "Blocked",
      assessment: {
        score: 98,
        level: "Critical",
        reasons: ["Confirmed phishing address", "External risk signal matched"],
        decision: "block",
      },
      policies: ["Address reputation", "Critical phishing block"],
      offset: 3,
    }),
    agent: createGuidedTransaction({
      id: "guided-agent-overspend",
      hashCharacter: "4",
      kind: "agent",
      type: "Guided agent request",
      token: "USDC",
      amount: 2_400,
      to: ADDRESSES.trusted,
      status: "Agent Denied",
      assessment: {
        score: 92,
        level: "Critical",
        reasons: [
          "Requested amount exceeds the $500 authority limit",
          "Only $320 of daily allowance remains",
        ],
        decision: "block",
      },
      policies: ["AI agent spending authority", "Private Policy Evaluation"],
      offset: 4,
    }),
    compromise: createGuidedTransaction({
      id: "guided-wallet-compromise",
      hashCharacter: "5",
      kind: "compromise",
      type: "Guided wallet compromise",
      token: "ETH",
      amount: 0,
      to: ADDRESSES.user,
      status: "Frozen",
      assessment: {
        score: 100,
        level: "Critical",
        reasons: ["Suspicious session takeover", "Unknown browser session"],
        decision: "block",
      },
      policies: ["Emergency freeze", "Reactive policy execution"],
      offset: 5,
    }),
    recovery: createGuidedTransaction({
      id: "guided-guardian-recovery",
      hashCharacter: "6",
      kind: "recovery",
      type: "Guided guardian recovery",
      token: "ETH",
      amount: 0,
      to: ADDRESSES.recovered,
      status: "Recovered",
      assessment: {
        score: 6,
        level: "Low",
        reasons: ["Two guardian approvals verified", "Recovery policy completed"],
        decision: "allow",
      },
      policies: ["Guardian approval 2 of 2", "Reactive Recovery Workflow"],
      offset: 6,
    }),
  };
}

function createGuidedBaseState(): WalletDataState {
  const initial = createInitialWalletData();
  return {
    ...initial,
    screen: "wallet",
    view: "tokens",
    settings: {
      ...initial.settings,
      aiAgentDailyLimit: 500,
    },
    activity: initial.activity.map((transaction) => ({
      ...transaction,
      createdAt: GUIDED_DEMO_TIME,
    })),
  };
}

export function getGuidedDemoSnapshot(
  stepIndex: number,
  phase: GuidedDemoPhase,
): WalletDataState {
  const index = Math.min(
    GUIDED_DEMO_STEPS.length - 1,
    Math.max(0, Number.isInteger(stepIndex) ? stepIndex : 0),
  );
  const completedCount =
    phase === "result"
      ? index + 1
      : phase === "complete"
        ? GUIDED_DEMO_STEPS.length
        : index;
  const transactions = guidedTransactions();
  let state = createGuidedBaseState();

  if (completedCount >= 1) {
    state = confirmTransactionState(state, transactions.normal);
  }
  if (completedCount >= 2) {
    state = recordActivityState(state, transactions.large);
  }
  if (completedCount >= 3) {
    state = recordActivityState(state, transactions.phishing);
  }
  if (completedCount >= 4) {
    state = recordActivityState(state, transactions.agent);
  }
  if (completedCount >= 5) {
    state = freezeWalletState(state, transactions.compromise);
  }
  if (completedCount >= 6) {
    state = completeRecoveryState(
      beginRecoveryState(state, transactions.recovery, GUIDED_DEMO_TIME),
    );
  }

  return {
    ...state,
    screen: "wallet",
    view:
      index === 2 || index === 3
        ? "activity"
        : "tokens",
    activeScenario: GUIDED_DEMO_STEPS[index].scenario,
  };
}

export function getGuidedDemoTransactionIds(): string[] {
  return Object.values(guidedTransactions()).map(
    (transaction) => transaction.id,
  );
}
