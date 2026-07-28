import type { MooloMascotState } from "@/components/moolo/MooloMascot";
import type { Locale } from "@/lib/i18n/types";
import type { DemoScenario } from "@/types";

export type GuidedDemoStepId =
  | "normal-transfer"
  | "large-transfer"
  | "phishing-block"
  | "agent-overspend"
  | "wallet-compromise"
  | "guardian-recovery";

export type GuidedDemoPhase =
  | "inactive"
  | "intro"
  | "running"
  | "result"
  | "complete";

export const GUIDED_DEMO_SIMULATION_LABEL =
  "Architecture simulation only";

export type GuidedDemoHighlightTarget =
  | "wallet-actions"
  | "security-delay"
  | "activity-list"
  | "wallet-status";

export interface GuidedDemoDetail {
  label: string;
  value: string;
}

export interface GuidedDemoNarration {
  intro: string;
  result: string;
}

export type LocalizedNarration = Record<Locale, GuidedDemoNarration>;

export interface GuidedDemoStep {
  id: GuidedDemoStepId;
  shortLabel: string;
  title: string;
  description: string;
  presenterNote: string;
  talkingPoints: [string, string];
  rialoConcept: string;
  rialoDescription: string;
  mooloStates: MooloMascotState[];
  highlightTargets: GuidedDemoHighlightTarget[];
  result: string;
  details: GuidedDemoDetail[];
  narration: LocalizedNarration;
  durationMs: number;
  scenario: DemoScenario;
}

export interface GuidedDemoState {
  active: boolean;
  currentStepIndex: number;
  phase: GuidedDemoPhase;
  completedSteps: GuidedDemoStepId[];
  startedAt: number | null;
}

export const GUIDED_DEMO_STEPS: readonly GuidedDemoStep[] = [
  {
    id: "normal-transfer",
    shortLabel: "Safe Transfer",
    title: "A normal transfer passes safely",
    description:
      "A small transfer to a previously trusted recipient stays within policy and is approved.",
    presenterNote:
      "Moolo does not interrupt safe activity. It reacts only when the transaction context requires protection.",
    talkingPoints: [
      "The wallet evaluates context before execution.",
      "No real transaction or asset is being used.",
    ],
    rialoConcept: "Reactive Transaction",
    rialoDescription:
      "The wallet evaluates the transaction context before allowing execution.",
    mooloStates: ["safe"],
    highlightTargets: ["wallet-actions"],
    result: "Approved",
    details: [
      { label: "Amount", value: "$125" },
      { label: "Recipient", value: "0x8A2F...91C4" },
      { label: "Recipient status", value: "Previously trusted" },
      { label: "Risk score", value: "8 / 100" },
    ],
    narration: {
      ko: {
        intro:
          "첫 번째는 정상적인 전송입니다. 소액이며 이전에 사용한 신뢰된 주소이기 때문에 추가적인 위험 신호가 없습니다.",
        result:
          "Moolo가 거래 맥락을 확인했습니다. 위험 신호가 없으므로 사용자의 정상적인 전송을 방해하지 않고 승인합니다.",
      },
      en: {
        intro:
          "The first scenario is a normal transfer to a previously trusted recipient with no additional risk signals.",
        result:
          "Moolo evaluated the transaction context and found no meaningful risk. The transfer is approved without interrupting normal activity.",
      },
    },
    durationMs: 650,
    scenario: "normal",
  },
  {
    id: "large-transfer",
    shortLabel: "Large Transfer",
    title: "A large transfer triggers a security delay",
    description:
      "A new-recipient transfer exceeds both the spending policy and enhanced review threshold.",
    presenterNote:
      "A risky transfer is not simply rejected. Moolo creates time for the owner to review and stop it.",
    talkingPoints: [
      "The delay is deterministic for this presentation.",
      "No external automation service is contacted.",
    ],
    rialoConcept: "Native Timer",
    rialoDescription:
      "A simulated native timer delays execution without relying on an external automation service.",
    mooloStates: ["scanning", "guard", "waiting"],
    highlightTargets: ["security-delay"],
    result: "Security Delay Active",
    details: [
      { label: "Amount", value: "$8,500" },
      { label: "Recipient", value: "0x71B3...D924" },
      { label: "Recipient status", value: "New recipient" },
      { label: "Risk score", value: "75 / 100" },
    ],
    narration: {
      ko: {
        intro:
          "이번에는 새로운 주소로 큰 금액을 보내려고 합니다. 금액과 수신자 정보가 보안 정책의 검토 기준을 초과했습니다.",
        result:
          "Moolo가 거래를 즉시 실행하지 않고 보안 지연을 적용했습니다. Native Timer 개념을 통해 사용자가 거래를 검토하고 취소할 시간을 확보합니다.",
      },
      en: {
        intro:
          "This transfer sends a large amount to a new recipient and exceeds the wallet's security review thresholds.",
        result:
          "Moolo applies a security delay instead of executing immediately. The simulated Native Timer gives the owner time to review or cancel the transfer.",
      },
    },
    durationMs: 1_100,
    scenario: "large",
  },
  {
    id: "phishing-block",
    shortLabel: "Phishing",
    title: "A phishing address is blocked before execution",
    description:
      "A locally simulated threat-intelligence match prevents the transfer before any balance can change.",
    presenterNote:
      "External security data becomes part of the wallet decision instead of remaining outside the execution flow.",
    talkingPoints: [
      "The recipient signal is simulated inside this browser.",
      "The blocked request leaves the balance untouched.",
    ],
    rialoConcept: "Validator-attested Web Call",
    rialoDescription:
      "Moolo simulates checking external threat intelligence and using an attested result inside the transaction policy.",
    mooloStates: ["alert", "guard"],
    highlightTargets: ["activity-list"],
    result: "Blocked",
    details: [
      { label: "Amount", value: "$420" },
      { label: "Recipient", value: "0xF19A...0BAD" },
      { label: "Threat status", value: "Confirmed phishing address" },
      { label: "Risk score", value: "98 / 100" },
    ],
    narration: {
      ko: {
        intro:
          "이번 수신 주소는 외부 위협 정보에서 피싱 주소로 확인된 것으로 시뮬레이션됩니다.",
        result:
          "Moolo가 외부 보안 신호를 정책 판단에 반영하여 거래가 실행되기 전에 차단했습니다. 사용자의 잔액은 변경되지 않습니다.",
      },
      en: {
        intro:
          "The recipient is simulated as a confirmed phishing address from external threat intelligence.",
        result:
          "Moolo brings the external security signal into the wallet policy and blocks the transfer before execution.",
      },
    },
    durationMs: 850,
    scenario: "phishing",
  },
  {
    id: "agent-overspend",
    shortLabel: "Agent Limit",
    title: "An AI agent cannot exceed its spending policy",
    description:
      "A simulated assistant requests more authority than the wallet owner granted, so the policy denies it.",
    presenterNote:
      "Autonomous agents can act, but they cannot silently exceed the authority granted by the wallet owner.",
    talkingPoints: [
      "The spending policy remains private in this concept demo.",
      "The denied request never changes the demo balance.",
    ],
    rialoConcept: "Private Policy Evaluation",
    rialoDescription:
      "The demo evaluates spending permissions without exposing unnecessary wallet policy details.",
    mooloStates: ["scanning", "guard"],
    highlightTargets: ["activity-list"],
    result: "Denied",
    details: [
      { label: "Agent", value: "Moolo Assistant Agent" },
      { label: "Requested amount", value: "$2,400" },
      { label: "Per-transaction limit", value: "$500" },
      { label: "Daily remaining", value: "$320" },
      { label: "Risk score", value: "92 / 100" },
    ],
    narration: {
      ko: {
        intro:
          "AI 에이전트가 사용자를 대신해 거래를 요청했지만, 요청 금액이 사용자가 허용한 지출 한도를 초과했습니다.",
        result:
          "Moolo가 에이전트의 권한과 지출 정책을 평가했습니다. 에이전트는 행동할 수 있지만 사용자가 부여한 권한을 넘어설 수 없습니다.",
      },
      en: {
        intro:
          "An AI agent is requesting a transaction that exceeds the spending authority granted by the wallet owner.",
        result:
          "Moolo evaluates the agent's permissions and denies the request. The agent can act, but it cannot exceed the owner's policy.",
      },
    },
    durationMs: 950,
    scenario: "agent",
  },
  {
    id: "wallet-compromise",
    shortLabel: "Freeze",
    title: "A compromise signal freezes the wallet",
    description:
      "A suspicious session-takeover signal immediately pauses outgoing wallet actions.",
    presenterNote:
      "The wallet reacts at the policy layer, freezing dangerous actions before the attacker can continue.",
    talkingPoints: [
      "Send and Swap become visibly unavailable.",
      "Safe Activity viewing remains available.",
    ],
    rialoConcept: "Reactive Transaction",
    rialoDescription:
      "A compromise signal changes the wallet state immediately and prevents further risky actions.",
    mooloStates: ["alert", "frozen"],
    highlightTargets: ["wallet-actions"],
    result: "Wallet Frozen",
    details: [
      { label: "Signal", value: "Suspicious session takeover" },
      { label: "Device", value: "Unknown browser session" },
      { label: "Risk score", value: "100 / 100" },
      { label: "Wallet state", value: "Frozen" },
    ],
    narration: {
      ko: {
        intro:
          "알 수 없는 브라우저 세션에서 지갑 탈취가 의심되는 비정상적인 접근이 감지되었습니다.",
        result:
          "Moolo가 위험한 후속 행동을 막기 위해 지갑을 동결했습니다. 보내기와 스왑처럼 자산을 이동하는 기능이 즉시 제한됩니다.",
      },
      en: {
        intro:
          "A suspicious session takeover signal has been detected from an unknown browser environment.",
        result:
          "Moolo freezes risky wallet actions before the attacker can continue. Sending, swapping, and agent spending are now restricted.",
      },
    },
    durationMs: 1_000,
    scenario: "compromise",
  },
  {
    id: "guardian-recovery",
    shortLabel: "Recovery",
    title: "A guardian restores the wallet safely",
    description:
      "Two simulated guardian approvals complete a policy-controlled recovery and restore safe actions.",
    presenterNote:
      "Moolo does not end with detection. It guides the wallet from protection into a controlled recovery state.",
    talkingPoints: [
      "Recovery preserves the simulated balances.",
      "Wallet actions return only after the workflow completes.",
    ],
    rialoConcept: "Reactive Recovery Workflow",
    rialoDescription:
      "Recovery is represented as a policy-controlled workflow rather than a manual state reset.",
    mooloStates: ["frozen", "scanning", "recovered", "safe"],
    highlightTargets: ["wallet-status"],
    result: "Wallet Recovered",
    details: [
      { label: "Recovery method", value: "Guardian approval" },
      { label: "Approvals", value: "2 of 2" },
      { label: "Previous state", value: "Frozen" },
      { label: "Wallet state", value: "Protected" },
    ],
    narration: {
      ko: {
        intro:
          "동결된 지갑을 안전하게 복구하기 위해 가디언 승인 절차를 시작합니다.",
        result:
          "필요한 가디언 승인이 완료되었습니다. Moolo가 복구 정책을 확인하고 지갑을 안전한 상태로 되돌렸습니다.",
      },
      en: {
        intro:
          "The recovery workflow begins with the wallet in a frozen state and requires guardian approval.",
        result:
          "The required guardian approvals are complete. Moolo verifies the recovery policy and restores the wallet to a safe state.",
      },
    },
    durationMs: 1_250,
    scenario: "guardian",
  },
] as const;

export const GUIDED_DEMO_COMPLETE_NARRATION: Record<Locale, string> = {
  ko: "가이드 데모가 완료되었습니다. Moolo는 정상 거래를 승인하고, 위험한 전송을 지연하며, 피싱과 과도한 에이전트 지출을 차단하고, 지갑 동결과 복구까지 하나의 흐름으로 연결했습니다.",
  en: "The guided demo is complete. Moolo approved safe activity, delayed risky transfers, blocked malicious actions, froze a compromised wallet, and guided it through recovery.",
};

export const GUIDED_DEMO_INITIAL_STATE: GuidedDemoState = {
  active: false,
  currentStepIndex: 0,
  phase: "inactive",
  completedSteps: [],
  startedAt: null,
};

const stepIds = new Set<GuidedDemoStepId>(
  GUIDED_DEMO_STEPS.map((step) => step.id),
);
const phases = new Set<GuidedDemoPhase>([
  "inactive",
  "intro",
  "running",
  "result",
  "complete",
]);

export function normalizeGuidedDemoState(input: unknown): GuidedDemoState {
  if (!input || typeof input !== "object") {
    return { ...GUIDED_DEMO_INITIAL_STATE };
  }

  const value = input as Partial<GuidedDemoState>;
  const currentStepIndex =
    typeof value.currentStepIndex === "number" &&
    Number.isInteger(value.currentStepIndex) &&
    value.currentStepIndex >= 0 &&
    value.currentStepIndex < GUIDED_DEMO_STEPS.length
      ? value.currentStepIndex
      : 0;
  const phase =
    typeof value.phase === "string" &&
    phases.has(value.phase as GuidedDemoPhase)
      ? (value.phase as GuidedDemoPhase)
      : "inactive";
  const completedSteps = Array.isArray(value.completedSteps)
    ? Array.from(
        new Set(
          value.completedSteps.filter(
            (step): step is GuidedDemoStepId =>
              typeof step === "string" &&
              stepIds.has(step as GuidedDemoStepId),
          ),
        ),
      )
    : [];
  const active = value.active === true && phase !== "inactive";

  if (!active) {
    return { ...GUIDED_DEMO_INITIAL_STATE };
  }

  return {
    active: true,
    currentStepIndex,
    phase,
    completedSteps,
    startedAt:
      typeof value.startedAt === "number" &&
      Number.isFinite(value.startedAt) &&
      value.startedAt > 0
        ? value.startedAt
        : null,
  };
}

export function getGuidedDemoStep(index: number): GuidedDemoStep {
  return GUIDED_DEMO_STEPS[
    Math.min(
      GUIDED_DEMO_STEPS.length - 1,
      Math.max(0, Number.isInteger(index) ? index : 0),
    )
  ];
}

export function getGuidedDemoNarration(
  stepIndex: number,
  phase: GuidedDemoPhase,
  locale: Locale,
): string | null {
  if (phase === "complete") {
    return GUIDED_DEMO_COMPLETE_NARRATION[locale];
  }
  if (phase === "inactive") return null;
  const narration = getGuidedDemoStep(stepIndex).narration[locale];
  return phase === "result" ? narration.result : narration.intro;
}

export function getGuidedDemoIntroMooloState(
  stepId: GuidedDemoStepId,
): MooloMascotState {
  return stepId === "guardian-recovery" ? "frozen" : "safe";
}
