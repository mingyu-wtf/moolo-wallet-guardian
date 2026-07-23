import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS } from "../lib/constants";
import { calculateRisk, getRiskLevel } from "../lib/risk-engine";

test("allows a normal trusted transfer with low risk", () => {
  const result = calculateRisk({
    amount: 100,
    token: "USDC",
    addressType: "trusted",
    settings: DEFAULT_SETTINGS,
  });

  assert.equal(result.score, 5);
  assert.equal(result.level, "Low");
  assert.equal(result.decision, "allow");
});

test("timelocks a 5,000 USDC transfer to a new address", () => {
  const result = calculateRisk({
    amount: 5000,
    token: "USDC",
    addressType: "new",
    settings: DEFAULT_SETTINGS,
  });

  assert.equal(result.score, 75);
  assert.equal(result.level, "High");
  assert.equal(result.decision, "timelock");
});

test("blocks a reported phishing address as critical risk", () => {
  const result = calculateRisk({
    amount: 250,
    token: "USDC",
    addressType: "phishing",
    settings: DEFAULT_SETTINGS,
  });

  assert.equal(result.score, 85);
  assert.equal(result.level, "Critical");
  assert.equal(result.decision, "block");
});

test("denies an AI agent request beyond its daily limit", () => {
  const result = calculateRisk({
    amount: 50,
    token: "USDC",
    addressType: "trusted",
    settings: DEFAULT_SETTINGS,
    isAgent: true,
  });

  assert.equal(result.score, 65);
  assert.equal(result.level, "High");
  assert.equal(result.decision, "timelock");
});

test("maps boundary scores to the expected risk level", () => {
  assert.equal(getRiskLevel(0), "Low");
  assert.equal(getRiskLevel(29), "Low");
  assert.equal(getRiskLevel(30), "Medium");
  assert.equal(getRiskLevel(60), "High");
  assert.equal(getRiskLevel(80), "Critical");
  assert.equal(getRiskLevel(100), "Critical");
});
