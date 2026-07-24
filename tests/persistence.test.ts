import assert from "node:assert/strict";
import test from "node:test";
import { sanitizePersistedWalletState } from "../lib/persistence";
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
