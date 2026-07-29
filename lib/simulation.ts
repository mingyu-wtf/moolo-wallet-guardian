import {
  createRialoWorkflow,
  type RialoWorkflowKind,
} from "@/lib/rialo";
import {
  fillSimulationRandomBytes,
  generateSimulationId,
} from "@/lib/random";
import type { DemoTransaction, RiskAssessment, TokenSymbol } from "@/types";

export function shortAddress(address: unknown): string {
  if (typeof address !== "string" || address.length < 10) {
    return "Unknown address";
  }
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function generateSimulationHash(): string {
  const bytes = fillSimulationRandomBytes(new Uint8Array(32));
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
    id: generateSimulationId(),
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

export function formatCurrency(value: unknown): string {
  const safeValue =
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatDateTime(value: unknown): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(new Date(value).getTime())
  ) {
    return "Unknown time";
  }
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return "Unknown time";
  }
}

export function formatTime(value: unknown): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isFinite(new Date(value).getTime())
  ) {
    return "Unknown time";
  }
  try {
    return new Date(value).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown time";
  }
}

export function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
