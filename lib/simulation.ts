import {
  createRialoWorkflow,
  type RialoWorkflowKind,
} from "@/lib/rialo";
import type { DemoTransaction, RiskAssessment, TokenSymbol } from "@/types";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function generateSimulationHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function generateSimulationMeta() {
  return {
    hash: generateSimulationHash(),
    blockNumber: 21_804_000 + Math.floor(Math.random() * 1_000),
    fee: Number((0.0002 + Math.random() * 0.0007).toFixed(6)),
  };
}

interface TransactionInput {
  type?: string;
  token: TokenSymbol;
  amount: number;
  from: string;
  to: string;
  assessment: RiskAssessment;
  status: DemoTransaction["status"];
  policies?: string[];
  rialoKind?: RialoWorkflowKind;
}

export function createDemoTransaction(
  input: TransactionInput,
): DemoTransaction {
  const meta = generateSimulationMeta();
  return {
    id: crypto.randomUUID(),
    ...meta,
    type: input.type ?? "Sent",
    token: input.token,
    amount: input.amount,
    from: input.from,
    to: input.to,
    status: input.status,
    riskScore: input.assessment.score,
    riskLevel: input.assessment.level,
    reasons: input.assessment.reasons,
    policies: input.policies ?? [
      "Spending policy",
      "Address reputation",
      "Reactive decision",
    ],
    rialoWorkflow: createRialoWorkflow({
      kind: input.rialoKind ?? "manual",
      assessment: input.assessment,
      amount: input.amount,
      token: input.token,
    }),
    createdAt: Date.now(),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
