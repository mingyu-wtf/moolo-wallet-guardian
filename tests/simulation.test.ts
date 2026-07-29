import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCurrency,
  formatDateTime,
  formatTime,
  shortAddress,
} from "../lib/simulation";
import { generateSimulationId } from "../lib/random";

test("invalid dates and numbers render safe fallback text", () => {
  assert.equal(formatDateTime(Number.MAX_SAFE_INTEGER), "Unknown time");
  assert.equal(formatDateTime(Number.NaN), "Unknown time");
  assert.equal(formatTime(Number.MAX_SAFE_INTEGER), "Unknown time");
  assert.equal(formatCurrency(null), "$0.00");
  assert.equal(shortAddress(null), "Unknown address");
});

test("simulation IDs remain available without relying on a wallet API", () => {
  assert.match(
    generateSimulationId(),
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
  );
});
