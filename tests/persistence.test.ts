import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePersistedWalletEnvelope,
  parsePersistedWalletEnvelope,
  sanitizePersistedWalletState,
  WALLET_STORAGE_VERSION,
} from "../lib/persistence";
import {
  createInitialWalletData,
  startTimeLockState,
} from "../lib/wallet-state";
import type { DemoTransaction } from "../types";

test("corrupted persisted values fall back to safe defaults", () => {
  const result = sanitizePersistedWalletState({
    view: "send",
    protectionState: "Frozen",
    balances: { ETH: -10, USDC: "broken", RLO: Infinity },
    settings: { timeLockSeconds: -2 },
    activity: [{ id: "invalid" }],
    walletAddress: "not-an-address",
  });

  assert.equal(result.view, "tokens");
  assert.equal(result.balances.ETH, 0);
  assert.equal(result.balances.USDC, 8_250);
  assert.equal(result.settings.timeLockSeconds, 5);
  assert.match(result.walletAddress, /^0x[a-fA-F0-9]{40}$/);
  assert.equal(result.activity.length, 0);
  assert.equal(result.pendingTransfer, null);
  assert.equal(result.recovery, null);
});

test("a valid time lock survives serialization and sanitization", () => {
  const initial = createInitialWalletData();
  const tx: DemoTransaction = {
    ...initial.activity[0],
    id: "persistent-timer",
    hash: `0x${"b".repeat(64)}`,
    type: "Sent",
    token: "USDC",
    amount: 5_000,
    status: "Timelocked",
  };
  const waiting = startTimeLockState(initial, tx, 10_000);
  const restored = sanitizePersistedWalletState(
    JSON.parse(JSON.stringify(waiting)),
  );

  assert.equal(restored.pendingTransfer?.transaction.id, tx.id);
  assert.equal(restored.pendingTransfer?.startedAt, 10_000);
  assert.equal(
    restored.pendingTransfer?.endsAt,
    10_000 + initial.settings.timeLockSeconds * 1_000,
  );
  assert.equal(
    restored.pendingTransfer?.transaction.rialoWorkflow.traces.length,
    4,
  );
});

test("legacy activities are migrated into real simulated Rialo workflows", () => {
  const initial = createInitialWalletData();
  const legacy = { ...initial.activity[0] };
  Reflect.deleteProperty(legacy, "rialoWorkflow");
  const restored = sanitizePersistedWalletState({
    ...initial,
    activity: [legacy],
  });

  assert.equal(restored.activity.length, 1);
  assert.equal(restored.activity[0].rialoWorkflow.traces.length, 4);
  assert.ok(
    restored.activity[0].rialoWorkflow.traces.every(
      (trace) => trace.simulated,
    ),
  );
});

test("a stale persisted envelope is normalized before Zustand hydrates it", () => {
  const initial = createInitialWalletData();
  const legacy = { ...initial.activity[0] };
  Reflect.deleteProperty(legacy, "rialoWorkflow");

  const normalized = normalizePersistedWalletEnvelope({
    version: 0,
    state: {
      ...initial,
      screen: "wallet",
      activity: [legacy],
    },
  });

  assert.ok(normalized);
  assert.equal(normalized.version, WALLET_STORAGE_VERSION);
  assert.equal(normalized.state.screen, "wallet");
  assert.equal(normalized.state.activity.length, 1);
  assert.equal(normalized.state.activity[0].rialoWorkflow.traces.length, 4);
});

test("invalid persisted envelopes are discarded instead of reaching the UI", () => {
  const initial = createInitialWalletData();
  assert.deepEqual(
    normalizePersistedWalletEnvelope(null).state.balances,
    initial.balances,
  );
  assert.deepEqual(
    normalizePersistedWalletEnvelope({ version: 3 }).state.settings,
    initial.settings,
  );
  assert.deepEqual(
    normalizePersistedWalletEnvelope({
      version: 3,
      state: "broken",
    }).state.balances,
    initial.balances,
  );
});

test("missing, empty, invalid, and null storage all recover to defaults", () => {
  const initial = createInitialWalletData();
  for (const raw of [null, "", "   ", "{broken-json", "null"]) {
    const restored = parsePersistedWalletEnvelope(raw);
    assert.deepEqual(restored.state.balances, initial.balances);
    assert.deepEqual(restored.state.settings, initial.settings);
    assert.ok(Array.isArray(restored.state.activity));
  }
});

test("legacy transaction and security settings aliases are normalized", () => {
  const initial = createInitialWalletData();
  const restored = sanitizePersistedWalletState({
    screen: "wallet",
    transactions: [initial.activity[0]],
    securitySettings: {
      protectionEnabled: false,
      timeLockSeconds: 42,
    },
  });

  assert.equal(restored.screen, "wallet");
  assert.equal(restored.activity.length, 1);
  assert.equal(restored.settings.protectionEnabled, false);
  assert.equal(restored.settings.timeLockSeconds, 42);
  assert.equal(
    restored.settings.largeTransferLimit,
    initial.settings.largeTransferLimit,
  );
});

test("invalid arrays, balances, settings, and transactions recover safely", () => {
  const initial = createInitialWalletData();
  const invalidStates = [
    { transactions: null },
    { transactions: { broken: true } },
    { balances: null },
    { balances: { ETH: "3.42", USDC: null, RLO: Infinity } },
    { settings: null },
    { securitySettings: { protectionEnabled: "yes" } },
    {
      activity: [
        {
          ...initial.activity[0],
          status: "Unknown",
        },
      ],
    },
  ];

  for (const value of invalidStates) {
    const restored = sanitizePersistedWalletState(value);
    assert.ok(Array.isArray(restored.activity));
    assert.ok(Number.isFinite(restored.balances.ETH));
    assert.equal(typeof restored.settings.protectionEnabled, "boolean");
  }
});

test("corrupted Rialo workflows are replaced with four safe traces", () => {
  const initial = createInitialWalletData();
  const corruptWorkflows = [
    undefined,
    null,
    { traces: null },
    {
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
          createdAt: "not-a-date",
        },
      ],
    },
  ];

  for (const rialoWorkflow of corruptWorkflows) {
    const restored = sanitizePersistedWalletState({
      ...initial,
      activity: [{ ...initial.activity[0], rialoWorkflow }],
    });
    assert.equal(restored.activity[0].rialoWorkflow.traces.length, 4);
    assert.ok(
      restored.activity[0].rialoWorkflow.traces.every(
        (trace) => trace.simulated,
      ),
    );
  }
});

test("invalid timestamps and incomplete pending states cannot reach rendering", () => {
  const initial = createInitialWalletData();
  const invalidTransaction = {
    ...initial.activity[0],
    createdAt: Number.MAX_SAFE_INTEGER,
    status: "Timelocked" as const,
  };
  const restored = sanitizePersistedWalletState({
    ...initial,
    activity: [invalidTransaction],
    pendingTransfer: {
      transaction: invalidTransaction,
      startedAt: "Invalid Date",
      endsAt: Number.MAX_SAFE_INTEGER,
    },
  });

  assert.ok(Number.isFinite(new Date(restored.activity[0].createdAt).getTime()));
  assert.equal(restored.pendingTransfer, null);
});

test("partial frozen and recovery states normalize consistently", () => {
  const initial = createInitialWalletData();
  const frozen = sanitizePersistedWalletState({
    ...initial,
    protectionState: "Frozen",
    recovery: { startedAt: Date.now() },
  });
  const recovering = sanitizePersistedWalletState({
    ...initial,
    protectionState: "Recovering",
    recovery: { startedAt: Date.now() },
  });

  assert.equal(frozen.protectionState, "Frozen");
  assert.equal(frozen.recovery, null);
  assert.equal(recovering.protectionState, "Frozen");
  assert.equal(recovering.recovery, null);
});

test("normalization ignores unknown fields and never throws for unknown inputs", () => {
  const inputs: unknown[] = [
    undefined,
    null,
    true,
    42,
    "state",
    [],
    {},
    { unknownFeature: { enabled: true } },
    { state: null, version: -1 },
  ];

  for (const input of inputs) {
    assert.doesNotThrow(() => sanitizePersistedWalletState(input));
    assert.doesNotThrow(() => normalizePersistedWalletEnvelope(input));
    const restored = sanitizePersistedWalletState(input);
    assert.ok(Array.isArray(restored.activity));
    assert.ok(Number.isFinite(restored.balances.USDC));
  }
});
