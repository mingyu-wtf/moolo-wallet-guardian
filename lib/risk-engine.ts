import { TOKEN_PRICES } from "@/lib/constants";
import type { RiskAssessment, RiskInput, RiskLevel } from "@/types";

const clampScore = (value: number) => Math.min(100, Math.max(0, value));

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

export function calculateRisk(input: RiskInput): RiskAssessment {
  const { amount, token, addressType, settings, isAgent, compromised } = input;
  const usdValue = amount * TOKEN_PRICES[token];
  let score = 5;
  const reasons: string[] = ["Baseline transaction screening"];

  if (!settings.protectionEnabled && addressType !== "phishing") {
    return {
      score,
      level: "Low",
      reasons: [
        "Moolo Protection is off",
        "Only critical phishing blocking remains active",
      ],
      decision: "allow",
    };
  }

  if (addressType === "new" && settings.protectNewAddresses) {
    score += 20;
    reasons.push("Recipient has no prior wallet history");
  }

  if (usdValue > settings.largeTransferLimit) {
    score += 30;
    reasons.push(
      `Transfer exceeds the $${settings.largeTransferLimit.toLocaleString()} policy limit`,
    );
  }

  if (usdValue >= 5000) {
    score += 20;
    reasons.push("Value is above the $5,000 enhanced review threshold");
  }

  if (addressType === "phishing") {
    score += 80;
    reasons.push("Address appears in 128 malicious activity reports");
  }

  if (addressType === "contract") {
    score += 40;
    reasons.push("Unverified contract requests unlimited token permission");
  }

  if (isAgent && usdValue > settings.aiAgentDailyLimit) {
    score += 60;
    reasons.push(
      `AI agent request exceeds the $${settings.aiAgentDailyLimit} daily limit`,
    );
  }

  if (compromised) {
    score += 60;
    reasons.push("Abnormal wallet behavior detected");
  }

  const finalScore = clampScore(score);
  const level = getRiskLevel(finalScore);
  const decision =
    addressType === "contract" ||
    (isAgent && usdValue > settings.aiAgentDailyLimit)
      ? "block"
      : level === "Critical"
      ? "block"
      : level === "High"
        ? "timelock"
        : level === "Medium"
          ? "review"
          : "allow";

  return { score: finalScore, level, reasons, decision };
}
