import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  getGuidedDemoSnapshot,
  getGuidedDemoTransactionIds,
} from "../lib/guided-demo-fixtures";
import {
  GUIDED_DEMO_INITIAL_STATE,
  GUIDED_DEMO_STEPS,
  normalizeGuidedDemoState,
} from "../lib/guided-demo";
import {
  resetGuidedDemoState,
  useGuidedDemoStore,
} from "../store/guided-demo-store";
import { resetMooloDemoState } from "../store/wallet-store";

afterEach(() => {
  resetGuidedDemoState();
});

test("Start Guided Demo opens Step 1 intro without executing a result", () => {
  const store = useGuidedDemoStore.getState();
  store.startGuidedDemo();
  const started = useGuidedDemoStore.getState();

  assert.equal(started.active, true);
  assert.equal(started.currentStepIndex, 0);
  assert.equal(started.phase, "intro");
  assert.deepEqual(started.completedSteps, []);
  assert.equal(typeof started.startedAt, "number");
});

test("Run Step is idempotent and reaches result only through completion", () => {
  const store = useGuidedDemoStore.getState();
  store.startGuidedDemo();

  assert.equal(useGuidedDemoStore.getState().runGuidedDemoStep(), true);
  assert.equal(useGuidedDemoStore.getState().runGuidedDemoStep(), false);
  assert.equal(useGuidedDemoStore.getState().phase, "running");
  assert.equal(
    useGuidedDemoStore.getState().completeGuidedDemoStep(),
    true,
  );
  assert.equal(useGuidedDemoStore.getState().phase, "result");
  assert.deepEqual(useGuidedDemoStore.getState().completedSteps, [
    "normal-transfer",
  ]);
  assert.equal(
    useGuidedDemoStore.getState().completeGuidedDemoStep(),
    false,
  );
});

test("Next stays blocked before result and enters the next intro after result", () => {
  useGuidedDemoStore.getState().startGuidedDemo();
  assert.equal(
    useGuidedDemoStore.getState().nextGuidedDemoStep(),
    false,
  );
  useGuidedDemoStore.getState().runGuidedDemoStep();
  assert.equal(
    useGuidedDemoStore.getState().nextGuidedDemoStep(),
    false,
  );
  useGuidedDemoStore.getState().completeGuidedDemoStep();
  assert.equal(
    useGuidedDemoStore.getState().nextGuidedDemoStep(),
    true,
  );
  assert.equal(useGuidedDemoStore.getState().currentStepIndex, 1);
  assert.equal(useGuidedDemoStore.getState().phase, "intro");
});

test("Previous restores the deterministic start snapshot for its target step", () => {
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  useGuidedDemoStore.getState().completeGuidedDemoStep();
  useGuidedDemoStore.getState().nextGuidedDemoStep();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  useGuidedDemoStore.getState().completeGuidedDemoStep();

  assert.equal(
    useGuidedDemoStore.getState().previousGuidedDemoStep(),
    true,
  );
  assert.equal(useGuidedDemoStore.getState().currentStepIndex, 0);
  assert.equal(useGuidedDemoStore.getState().phase, "intro");
  assert.deepEqual(
    getGuidedDemoSnapshot(0, "intro"),
    getGuidedDemoSnapshot(0, "intro"),
  );
  assert.equal(
    getGuidedDemoSnapshot(1, "intro").balances.USDC,
    getGuidedDemoSnapshot(0, "result").balances.USDC,
  );
});

test("guided fixtures freeze in Step 5 and recover in Step 6", () => {
  const frozen = getGuidedDemoSnapshot(4, "result");
  const recoveryIntro = getGuidedDemoSnapshot(5, "intro");
  const recovered = getGuidedDemoSnapshot(5, "result");

  assert.equal(frozen.protectionState, "Frozen");
  assert.equal(recoveryIntro.protectionState, "Frozen");
  assert.equal(recovered.protectionState, "Protected");
  assert.notEqual(recovered.walletAddress, frozen.walletAddress);
  assert.equal(
    recovered.activity.find(
      (item) => item.id === "guided-guardian-recovery",
    )?.status,
    "Recovered",
  );
  assert.equal(recovered.balances.USDC, frozen.balances.USDC);
});

test("all guided activity IDs remain unique and every workflow has four traces", () => {
  const complete = getGuidedDemoSnapshot(5, "complete");
  const guidedIds = new Set(getGuidedDemoTransactionIds());
  const guidedActivity = complete.activity.filter((item) =>
    guidedIds.has(item.id),
  );

  assert.equal(guidedActivity.length, GUIDED_DEMO_STEPS.length);
  assert.equal(
    new Set(guidedActivity.map((item) => item.id)).size,
    guidedActivity.length,
  );
  guidedActivity.forEach((transaction) => {
    assert.equal(transaction.rialoWorkflow.traces.length, 4);
  });
});

test("invalid guided state normalizes safely to inactive Step 1", () => {
  assert.deepEqual(
    normalizeGuidedDemoState({
      active: true,
      currentStepIndex: 99,
      phase: "teleporting",
      completedSteps: [null, "unknown"],
      startedAt: Number.NaN,
    }),
    GUIDED_DEMO_INITIAL_STATE,
  );

  useGuidedDemoStore.getState().replaceGuidedDemoState({
    active: true,
    currentStepIndex: -5,
    phase: "intro",
    completedSteps: ["normal-transfer", "normal-transfer", "bad"],
  });
  assert.equal(useGuidedDemoStore.getState().currentStepIndex, 0);
  assert.deepEqual(useGuidedDemoStore.getState().completedSteps, [
    "normal-transfer",
  ]);
});

test("Exit and Reset clear ephemeral Guided Demo state", () => {
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().exitGuidedDemo();
  assert.deepEqual(
    {
      active: useGuidedDemoStore.getState().active,
      currentStepIndex: useGuidedDemoStore.getState().currentStepIndex,
      phase: useGuidedDemoStore.getState().phase,
      completedSteps: useGuidedDemoStore.getState().completedSteps,
      startedAt: useGuidedDemoStore.getState().startedAt,
    },
    GUIDED_DEMO_INITIAL_STATE,
  );

  useGuidedDemoStore.getState().startGuidedDemo();
  resetMooloDemoState();
  assert.equal(useGuidedDemoStore.getState().active, false);
  assert.equal(useGuidedDemoStore.getState().phase, "inactive");
});
