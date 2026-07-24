import assert from "node:assert/strict";
import test from "node:test";
import {
  beginRecoveryState,
  cancelPendingState,
  completeRecoveryState,
  completeTimeLockState,
  confirmTransactionState,
  createInitialWalletData,
  freezeWalletState,
  requestGuardianState,
  startTimeLockState,
} from "../lib/wallet-state";
import { createRialoWorkflow } from "../lib/rialo";
import type { DemoTransaction, TransactionStatus } from "../types";

function transaction(
  id: string,
  status: TransactionStatus,
  amount = 100,
): DemoTransaction {
  return {
    id,
    hash: `0x${"a".repeat(64)}`,
    blockNumber: 21_804_111,
    fee: 0.0004,
    type: "Sent",
    token: "USDC",
    amount,
    from: "0x71F4A8C9B2E61D53047A823FCF14913E339A9A2C",
    to: "0x82A1D16E30C74F29D5872A7EDE10884636A24F09",
    status,
    riskScore: 5,
    riskLevel: "Low",
    reasons: ["Trusted address"],
    policies: ["Address reputation"],
    rialoWorkflow: createRialoWorkflow({
      kind: "manual",
      amount,
      token: "USDC",
      assessment: {
        score: 5,
        level: "Low",
        reasons: ["Trusted address"],
        decision: "allow",
      },
    }),
    createdAt: 1_000,
  };
}

test("normal confirmation deducts once and creates one 64-byte-hash activity", () => {
  const initial = createInitialWalletData();
  const tx = transaction("normal", "Confirmed");
  const once = confirmTransactionState(initial, tx);
  const twice = confirmTransactionState(once, tx);

  assert.equal(once.balances.USDC, initial.balances.USDC - 100);
  assert.equal(twice.balances.USDC, once.balances.USDC);
  assert.equal(twice.activity.filter((item) => item.id === tx.id).length, 1);
  assert.match(tx.hash, /^0x[a-f0-9]{64}$/);
});

test("time lock completes once after its persisted end time", () => {
  const initial = createInitialWalletData();
  const tx = transaction("timelock", "Timelocked", 5_000);
  const waiting = startTimeLockState(initial, tx, 10_000);

  assert.equal(
    completeTimeLockState(waiting, waiting.pendingTransfer!.endsAt - 1),
    waiting,
  );
  const completed = completeTimeLockState(
    waiting,
    waiting.pendingTransfer!.endsAt,
  );
  const repeated = completeTimeLockState(
    completed,
    waiting.pendingTransfer!.endsAt + 1_000,
  );
  assert.equal(completed.balances.USDC, initial.balances.USDC - 5_000);
  assert.equal(repeated.balances.USDC, completed.balances.USDC);
  assert.equal(repeated.pendingTransfer, null);
  assert.equal(repeated.activity.filter((item) => item.id === tx.id).length, 1);
});

test("cancelled time lock can never complete later", () => {
  const initial = createInitialWalletData();
  const tx = transaction("cancelled", "Timelocked", 5_000);
  const waiting = startTimeLockState(initial, tx, 10_000);
  const cancelled = cancelPendingState(waiting);
  const afterDeadline = completeTimeLockState(cancelled, 100_000);

  assert.equal(afterDeadline.balances.USDC, initial.balances.USDC);
  assert.equal(afterDeadline.pendingTransfer, null);
  assert.equal(
    afterDeadline.activity.find((item) => item.id === tx.id)?.status,
    "Cancelled",
  );
});

test("time lock refuses an amount above the simulated balance", () => {
  const initial = createInitialWalletData();
  const tx = transaction("too-large", "Timelocked", 9_000);
  assert.equal(startTimeLockState(initial, tx, 10_000), initial);
});

test("guardian transitions update one activity and settle once", () => {
  const initial = createInitialWalletData();
  const tx = transaction("guardian", "Timelocked", 5_000);
  const waiting = startTimeLockState(initial, tx, 10_000);
  const guardian = requestGuardianState(waiting);
  const approved = confirmTransactionState(
    guardian,
    guardian.pendingTransfer!.transaction,
  );
  const repeated = confirmTransactionState(approved, tx);

  assert.equal(
    guardian.activity.filter((item) => item.id === tx.id).length,
    1,
  );
  assert.equal(repeated.activity.filter((item) => item.id === tx.id).length, 1);
  assert.equal(repeated.balances.USDC, initial.balances.USDC - 5_000);
});

test("freeze exits send, then recovery records one separate event", () => {
  const initial = { ...createInitialWalletData(), view: "send" as const };
  const frozenTx = transaction("freeze", "Frozen", 0);
  const frozen = freezeWalletState(initial, frozenTx);
  const recoveryTx = {
    ...transaction("recovery", "Recovered", 0),
    type: "Wallet recovery",
  };
  const recovering = beginRecoveryState(frozen, recoveryTx, 20_000);
  const recovered = completeRecoveryState(recovering);
  const repeated = completeRecoveryState(recovered);

  assert.equal(frozen.view, "tokens");
  assert.equal(recovered.protectionState, "Protected");
  assert.notEqual(recovered.walletAddress, initial.walletAddress);
  assert.equal(
    repeated.activity.filter((item) => item.id === recoveryTx.id).length,
    1,
  );
});
