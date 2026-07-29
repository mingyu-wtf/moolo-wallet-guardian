import {
  MOOLO_STORAGE_KEYS,
  MOOLO_STORAGE_PREFIX,
} from "@/lib/moolo-storage";
import { WALLET_STORAGE_KEY } from "@/lib/persistence";

const address = "0x71F4A8C9B2E61D53047A823FCF14913E339A9A2C";

const transaction = {
  id: "dev-fixture",
  hash: `0x${"a".repeat(64)}`,
  blockNumber: 21_804_111,
  fee: 0.0004,
  type: "Sent",
  token: "USDC",
  amount: 100,
  from: address,
  to: "0x82A1D16E30C74F29D5872A7EDE10884636A24F09",
  status: "Confirmed",
  riskScore: 5,
  riskLevel: "Low",
  reasons: ["Trusted address"],
  policies: ["Address reputation"],
  createdAt: Date.now(),
};

const baseState = {
  screen: "wallet",
  view: "activity",
  balances: { ETH: 3.42, USDC: 8_250, RLO: 1_240 },
  settings: {
    protectionEnabled: true,
    largeTransferLimit: 1_000,
    timeLockSeconds: 30,
    guardianThreshold: 5_000,
    aiAgentDailyLimit: 10,
    blockSuspiciousAddresses: true,
    protectNewAddresses: true,
    emergencyFreeze: true,
  },
  protectionState: "Protected",
  walletAddress: address,
  activity: [transaction],
  pendingTransfer: null,
  recovery: null,
  settledTransactionIds: [],
  activeScenario: null,
};

function envelope(state: unknown, version = 4): string {
  return JSON.stringify({ state, version });
}

const fixtures: Record<string, string | null> = {
  clean: null,
  "invalid-json": "{not-json",
  "empty-object": JSON.stringify({}),
  null: "null",
  "missing-state": JSON.stringify({ version: 4 }),
  legacy: envelope(
    {
      ...baseState,
      activity: [{ ...transaction }],
      pendingTransfer: null,
    },
    0,
  ),
  "transactions-null": envelope({
    ...baseState,
    activity: undefined,
    transactions: null,
  }),
  "transactions-object": envelope({
    ...baseState,
    activity: undefined,
    transactions: { broken: true },
  }),
  "balances-missing": envelope({ ...baseState, balances: undefined }),
  "balances-null": envelope({ ...baseState, balances: null }),
  "balances-strings": envelope({
    ...baseState,
    balances: { ETH: "3.42", USDC: "8250", RLO: "1240" },
  }),
  "settings-missing": envelope({ ...baseState, settings: undefined }),
  "settings-partial": envelope({
    ...baseState,
    settings: { protectionEnabled: true },
  }),
  "invalid-status": envelope({
    ...baseState,
    activity: [{ ...transaction, status: "Unknown" }],
  }),
  "workflow-missing": envelope({
    ...baseState,
    activity: [{ ...transaction, rialoWorkflow: undefined }],
  }),
  "workflow-null": envelope({
    ...baseState,
    activity: [{ ...transaction, rialoWorkflow: null }],
  }),
  "workflow-corrupt": envelope({
    ...baseState,
    activity: [
      {
        ...transaction,
        rialoWorkflow: {
          workflowName: "Broken",
          predicateSummary: "Broken",
          finalDecision: "allow",
          traces: null,
        },
      },
    ],
  }),
  "workflow-bad-primitive": envelope({
    ...baseState,
    activity: [
      {
        ...transaction,
        rialoWorkflow: {
          workflowName: "Broken",
          predicateSummary: "Broken",
          finalDecision: "allow",
          traces: [
            {
              id: "broken",
              primitive: "unknown",
              title: "Broken",
              description: "Broken",
              status: "completed",
              simulated: true,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      },
    ],
  }),
  "invalid-timestamp": envelope({
    ...baseState,
    activity: [{ ...transaction, createdAt: Number.MAX_SAFE_INTEGER }],
  }),
  "invalid-timelock": envelope({
    ...baseState,
    pendingTransfer: {
      transaction: { ...transaction, status: "Timelocked" },
      startedAt: "Invalid Date",
      endsAt: "Invalid Date",
    },
  }),
  "frozen-partial": envelope({
    ...baseState,
    protectionState: "Frozen",
    recovery: null,
  }),
  "recovery-partial": envelope({
    ...baseState,
    protectionState: "Recovering",
    recovery: { startedAt: Date.now() },
  }),
  "unknown-fields": envelope({
    ...baseState,
    unknownFeature: { enabled: true },
  }),
};

export function applyDevelopmentPersistenceFixture(): boolean {
  const params = new URLSearchParams(window.location.search);
  const fixtureName = params.get("mooloFixture");
  if (fixtureName === "blocked-storage") {
    Storage.prototype.getItem = () => {
      throw new DOMException("Access to storage is blocked", "SecurityError");
    };
    Storage.prototype.removeItem = () => {
      throw new DOMException("Access to storage is blocked", "SecurityError");
    };
    return false;
  }
  if (!fixtureName || !(fixtureName in fixtures)) return false;

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(MOOLO_STORAGE_PREFIX)) localStorage.removeItem(key);
  }
  for (let index = sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = sessionStorage.key(index);
    if (
      key?.startsWith(MOOLO_STORAGE_PREFIX) &&
      !(
        params.get("mooloForceError") === "true" &&
        key === MOOLO_STORAGE_KEYS.errorRetryCount
      )
    ) {
      sessionStorage.removeItem(key);
    }
  }

  const fixture = fixtures[fixtureName];
  if (fixture !== null) localStorage.setItem(WALLET_STORAGE_KEY, fixture);
  return params.get("mooloForceError") === "true";
}
