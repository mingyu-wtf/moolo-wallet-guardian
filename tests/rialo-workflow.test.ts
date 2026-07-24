import assert from "node:assert/strict";
import test from "node:test";
import {
  createRialoWorkflow,
  RIALO_PRIMITIVE_META,
  transitionRialoWorkflow,
} from "../lib/rialo";
import type {
  RialoPrimitive,
  RiskAssessment,
  TransactionStatus,
} from "../types";

const lowRisk: RiskAssessment = {
  score: 5,
  level: "Low",
  reasons: ["Trusted recipient"],
  decision: "allow",
};

function workflow(
  kind: Parameters<typeof createRialoWorkflow>[0]["kind"],
  assessment = lowRisk,
) {
  return createRialoWorkflow({
    kind,
    assessment,
    amount: kind === "large" || kind === "guardian" ? 5_000 : 100,
    token: "USDC",
  });
}

function traceStatus(
  kind: Parameters<typeof createRialoWorkflow>[0]["kind"],
  primitive: RialoPrimitive,
) {
  return workflow(kind).traces.find((trace) => trace.primitive === primitive)
    ?.status;
}

test("every major scenario emits four explicitly simulated Rialo traces", () => {
  for (const kind of [
    "normal",
    "large",
    "phishing",
    "contract",
    "agent",
    "compromise",
    "guardian",
    "recovery",
  ] as const) {
    const result = workflow(kind);
    assert.equal(result.traces.length, 4);
    assert.ok(result.traces.every((trace) => trace.simulated === true));
    assert.deepEqual(
      new Set(result.traces.map((trace) => trace.primitive)),
      new Set(Object.keys(RIALO_PRIMITIVE_META)),
    );
  }
});

test("risk scenarios map to meaningful primitive states and decisions", () => {
  assert.equal(workflow("normal").finalDecision, "allow");
  assert.equal(traceStatus("normal", "reactive-transaction"), "completed");
  assert.equal(workflow("large").finalDecision, "delay");
  assert.equal(traceStatus("large", "native-timer"), "waiting");
  assert.equal(workflow("phishing").finalDecision, "deny");
  assert.equal(traceStatus("phishing", "reactive-transaction"), "blocked");
  assert.equal(workflow("agent").finalDecision, "deny");
  assert.equal(traceStatus("agent", "private-policy"), "completed");
  assert.equal(
    traceStatus("agent", "validator-attested-web-call"),
    "skipped",
  );
  assert.equal(workflow("compromise").finalDecision, "freeze");
  assert.equal(workflow("recovery").finalDecision, "recover");
});

test("native timer and final decision transition with transaction status", () => {
  const delayed = workflow("large");
  const statuses: Array<[TransactionStatus, string, string]> = [
    ["Timelocked", "waiting", "delay"],
    ["Awaiting Guardian", "waiting", "require-guardian"],
    ["Confirmed", "completed", "allow"],
    ["Cancelled", "skipped", "deny"],
  ];

  for (const [status, expectedTimer, expectedDecision] of statuses) {
    const transitioned = transitionRialoWorkflow(delayed, status);
    assert.equal(
      transitioned.traces.find(
        (trace) => trace.primitive === "native-timer",
      )?.status,
      expectedTimer,
    );
    assert.equal(transitioned.finalDecision, expectedDecision);
  }
});

test("safe architecture labels make simulation boundaries explicit", () => {
  assert.equal(
    RIALO_PRIMITIVE_META["reactive-transaction"].simulationLabel,
    "Rialo Architecture Simulation",
  );
  assert.equal(
    RIALO_PRIMITIVE_META["validator-attested-web-call"].simulationLabel,
    "Simulated external signal",
  );
  assert.equal(
    RIALO_PRIMITIVE_META["private-policy"].simulationLabel,
    "REX concept simulation",
  );
});
