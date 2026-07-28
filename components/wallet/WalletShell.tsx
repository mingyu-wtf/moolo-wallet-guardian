"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileClock,
  LockKeyhole,
  Menu,
  RefreshCw,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { Brand } from "@/components/moolo/Brand";
import {
  MooloMascot,
  type MooloMascotState,
} from "@/components/moolo/MooloMascot";
import { RialoPrimitiveGrid } from "@/components/rialo/RialoArchitecture";
import { RialoMark } from "@/components/rialo/RialoMark";
import {
  SecurityExperience,
  type SecurityExperienceState,
} from "@/components/security/SecurityExperience";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { StatusBadge } from "@/components/security/StatusBadge";
import { SendView } from "@/components/wallet/SendView";
import {
  ADDRESSES,
  SCENARIO_LABELS,
  TOKENS,
  TOKEN_PRICES,
} from "@/lib/constants";
import { getGuidedDemoSnapshot } from "@/lib/guided-demo-fixtures";
import {
  getGuidedDemoNarration,
  getGuidedDemoIntroMooloState,
  getGuidedDemoStep,
  type GuidedDemoStepId,
} from "@/lib/guided-demo";
import { calculateRisk } from "@/lib/risk-engine";
import {
  createDemoTransaction,
  shortAddress,
} from "@/lib/simulation";
import { useWalletStore, type WalletView } from "@/store/wallet-store";
import { useGuidedDemoStore } from "@/store/guided-demo-store";
import { createInitialWalletData } from "@/lib/wallet-state";
import { useTranslation } from "@/hooks/useTranslation";
import { useGuidedDemoNarration } from "@/hooks/useGuidedDemoNarration";
import { useLocaleStore } from "@/store/locale-store";
import type { DemoScenario, DemoTransaction } from "@/types";

type DemoCue =
  | "launch"
  | "warning"
  | "reset"
  | "success"
  | "scan"
  | "policy"
  | "freeze"
  | "recovery";

let activeDemoAudioContext: AudioContext | null = null;

function stopActiveDemoCue() {
  const context = activeDemoAudioContext;
  activeDemoAudioContext = null;
  if (!context || context.state === "closed") return;
  try {
    void context.close();
  } catch {
    // Audio cleanup must never interrupt the wallet experience.
  }
}

function playDemoCue(cue: DemoCue) {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    stopActiveDemoCue();
    const context = new window.AudioContext();
    activeDemoAudioContext = context;
    const notes =
      cue === "warning"
        ? [
            { frequency: 270, offset: 0, duration: 0.12 },
            { frequency: 210, offset: 0.13, duration: 0.16 },
          ]
        : cue === "reset"
          ? [
              { frequency: 330, offset: 0, duration: 0.1 },
              { frequency: 440, offset: 0.11, duration: 0.13 },
            ]
          : cue === "success"
            ? [
                { frequency: 440, offset: 0, duration: 0.08 },
                { frequency: 620, offset: 0.09, duration: 0.14 },
              ]
            : cue === "scan"
              ? [
                  { frequency: 310, offset: 0, duration: 0.1 },
                  { frequency: 390, offset: 0.12, duration: 0.1 },
                  { frequency: 470, offset: 0.24, duration: 0.14 },
                ]
              : cue === "policy"
                ? [
                    { frequency: 360, offset: 0, duration: 0.1 },
                    { frequency: 300, offset: 0.12, duration: 0.12 },
                    { frequency: 420, offset: 0.26, duration: 0.13 },
                  ]
                : cue === "freeze"
                  ? [
                      { frequency: 290, offset: 0, duration: 0.11 },
                      { frequency: 190, offset: 0.13, duration: 0.19 },
                    ]
                  : cue === "recovery"
                    ? [
                        { frequency: 330, offset: 0, duration: 0.09 },
                        { frequency: 440, offset: 0.1, duration: 0.1 },
                        { frequency: 590, offset: 0.22, duration: 0.16 },
                      ]
                    : [
              { frequency: 390, offset: 0, duration: 0.09 },
              { frequency: 520, offset: 0.1, duration: 0.12 },
            ];

    notes.forEach((note, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + note.offset;
      const end = start + note.duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.035, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end);

      if (index === notes.length - 1) {
        oscillator.addEventListener("ended", () => {
          if (activeDemoAudioContext === context) {
            activeDemoAudioContext = null;
          }
          if (context.state !== "closed") void context.close();
        });
      }
    });
  } catch (error) {
    stopActiveDemoCue();
    if (process.env.NODE_ENV === "development") {
      console.warn("[Moolo audio] Demo cue unavailable", error);
    }
  }
}

const guidedCueByStep: Record<GuidedDemoStepId, DemoCue> = {
  "normal-transfer": "success",
  "large-transfer": "scan",
  "phishing-block": "warning",
  "agent-overspend": "policy",
  "wallet-compromise": "freeze",
  "guardian-recovery": "recovery",
};

const tabItems: Array<{
  id: Exclude<WalletView, "send">;
  label: string;
  icon: typeof WalletCards;
}> = [
  { id: "tokens", label: "Tokens", icon: WalletCards },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "shield", label: "Shield", icon: ShieldCheck },
];

interface ActionButtonProps {
  icon: typeof Send;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  primary,
  disabled,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      className={`wallet-action ${primary ? "wallet-action-primary" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <span>
        <Icon size={19} aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}

export function WalletShell() {
  const { locale, t, tx, formatCurrency, formatNumber } =
    useTranslation();
  const view = useWalletStore((state) => state.view);
  const setView = useWalletStore((state) => state.setView);
  const balances = useWalletStore((state) => state.balances);
  const settings = useWalletStore((state) => state.settings);
  const protectionState = useWalletStore((state) => state.protectionState);
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const pendingTransfer = useWalletStore((state) => state.pendingTransfer);
  const activeScenario = useWalletStore((state) => state.activeScenario);
  const setActiveScenario = useWalletStore(
    (state) => state.setActiveScenario,
  );
  const addActivity = useWalletStore((state) => state.addActivity);
  const startTimeLock = useWalletStore((state) => state.startTimeLock);
  const setAwaitingGuardian = useWalletStore(
    (state) => state.setAwaitingGuardian,
  );
  const freezeWallet = useWalletStore((state) => state.freezeWallet);
  const guidedActive = useGuidedDemoStore((state) => state.active);
  const guidedStepIndex = useGuidedDemoStore(
    (state) => state.currentStepIndex,
  );
  const guidedPhase = useGuidedDemoStore((state) => state.phase);
  const [experience, setExperience] =
    useState<SecurityExperienceState | null>(null);
  const [mobileDemoOpen, setMobileDemoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [guidedMascotState, setGuidedMascotState] =
    useState<MooloMascotState>("safe");
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const guidedTimeoutsRef = useRef<number[]>([]);
  const narrationTimeoutsRef = useRef<number[]>([]);
  const {
    enabled: narrationEnabled,
    status: narrationStatus,
    supported: narrationSupported,
    speakNarration,
    cancelNarration,
    pauseNarration,
    resumeNarration,
    replayNarration,
    toggleNarration,
  } = useGuidedDemoNarration(locale);

  useEffect(
    () => () => {
      guidedTimeoutsRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      guidedTimeoutsRef.current = [];
      narrationTimeoutsRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      narrationTimeoutsRef.current = [];
      stopActiveDemoCue();
    },
    [],
  );

  const totalBalance = useMemo(
    () =>
      TOKENS.reduce(
        (total, token) =>
          total + balances[token.symbol] * TOKEN_PRICES[token.symbol],
        0,
      ),
    [balances],
  );

  const createScenarioTransaction = (
    scenario: DemoScenario,
  ): DemoTransaction => {
    const scenarioInput = {
      normal: {
        amount: 100,
        token: "USDC" as const,
        to: ADDRESSES.trusted,
        addressType: "trusted" as const,
      },
      large: {
        amount: 5000,
        token: "USDC" as const,
        to: ADDRESSES.new,
        addressType: "new" as const,
      },
      phishing: {
        amount: 250,
        token: "USDC" as const,
        to: ADDRESSES.phishing,
        addressType: "phishing" as const,
      },
      contract: {
        amount: 0,
        token: "USDC" as const,
        to: ADDRESSES.contract,
        addressType: "contract" as const,
      },
      agent: {
        amount: 50,
        token: "USDC" as const,
        to: ADDRESSES.trusted,
        addressType: "trusted" as const,
      },
      compromise: {
        amount: 0,
        token: "ETH" as const,
        to: walletAddress,
        addressType: "trusted" as const,
      },
      guardian: {
        amount: 5000,
        token: "USDC" as const,
        to: ADDRESSES.new,
        addressType: "new" as const,
      },
    }[scenario];

    const assessment = calculateRisk({
      ...scenarioInput,
      settings,
      isAgent: scenario === "agent",
      compromised: scenario === "compromise",
    });

    const status =
      scenario === "agent"
        ? "Agent Denied"
        : scenario === "compromise"
          ? "Frozen"
          : scenario === "contract" || scenario === "phishing"
            ? "Blocked"
            : scenario === "large" || scenario === "guardian"
              ? "Timelocked"
              : "Confirmed";

    return createDemoTransaction({
      type:
        scenario === "agent"
          ? "Agent request"
          : scenario === "contract"
            ? "Contract interaction"
            : scenario === "compromise"
              ? "Wallet compromise"
              : "Sent",
      token: scenarioInput.token,
      amount: scenarioInput.amount,
      from: walletAddress,
      to: scenarioInput.to,
      assessment,
      status,
      rialoKind: scenario,
      policies:
        scenario === "agent"
          ? ["AI agent daily limit", "Reactive decision"]
          : scenario === "compromise"
            ? ["Emergency freeze", "Guardian recovery"]
            : scenario === "contract"
              ? ["Contract verification", "Token approval limit"]
              : undefined,
    });
  };

  const clearGuidedTimers = useCallback(() => {
    guidedTimeoutsRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    guidedTimeoutsRef.current = [];
  }, []);

  const clearNarrationTimers = useCallback(() => {
    narrationTimeoutsRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    narrationTimeoutsRef.current = [];
  }, []);

  const scheduleNarration = useCallback(
    (getText: () => string | null, delayMs: number) => {
      const timer = window.setTimeout(() => {
        narrationTimeoutsRef.current =
          narrationTimeoutsRef.current.filter(
            (scheduled) => scheduled !== timer,
          );
        const text = getText();
        if (text) speakNarration(text);
      }, delayMs);
      narrationTimeoutsRef.current.push(timer);
    },
    [speakNarration],
  );

  const applyGuidedSnapshot = useCallback(
    (stepIndex: number, phase: "intro" | "result" | "complete") => {
      useWalletStore.setState({
        ...getGuidedDemoSnapshot(stepIndex, phase),
        hasHydrated: true,
      });
    },
    [],
  );

  const handleGuidedStart = useCallback(() => {
    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    stopActiveDemoCue();
    setExperience(null);
    setDemoMessage("Guided Demo ready. Step 1 has not run yet.");
    useGuidedDemoStore.getState().startGuidedDemo();
    applyGuidedSnapshot(0, "intro");
    setGuidedMascotState(
      getGuidedDemoIntroMooloState(getGuidedDemoStep(0).id),
    );
    const text = getGuidedDemoNarration(0, "intro", locale);
    if (text) speakNarration(text);
  }, [
    applyGuidedSnapshot,
    cancelNarration,
    clearGuidedTimers,
    clearNarrationTimers,
    locale,
    speakNarration,
  ]);

  const handleGuidedRun = useCallback(() => {
    const guidedStore = useGuidedDemoStore.getState();
    const stepIndex = guidedStore.currentStepIndex;
    const step = getGuidedDemoStep(stepIndex);
    if (!guidedStore.runGuidedDemoStep()) return;

    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    setExperience(null);
    setGuidedMascotState(step.mooloStates[0]);
    setDemoMessage(`${step.shortLabel} is running locally.`);
    if (soundEnabled) playDemoCue(guidedCueByStep[step.id]);

    step.mooloStates.slice(1).forEach((state, index, states) => {
      const timer = window.setTimeout(
        () => setGuidedMascotState(state),
        Math.round(
          step.durationMs * ((index + 1) / (states.length + 1)),
        ),
      );
      guidedTimeoutsRef.current.push(timer);
    });

    const completionTimer = window.setTimeout(() => {
      const latest = useGuidedDemoStore.getState();
      if (
        !latest.active ||
        latest.phase !== "running" ||
        latest.currentStepIndex !== stepIndex
      ) {
        return;
      }
      applyGuidedSnapshot(stepIndex, "result");
      latest.completeGuidedDemoStep();
      setGuidedMascotState(
        step.mooloStates[step.mooloStates.length - 1],
      );
      setDemoMessage(`${step.shortLabel}: ${step.result}.`);
      scheduleNarration(
        () =>
          getGuidedDemoNarration(
            stepIndex,
            "result",
            useLocaleStore.getState().locale,
          ),
        120,
      );
    }, step.durationMs);
    guidedTimeoutsRef.current.push(completionTimer);
  }, [
    applyGuidedSnapshot,
    cancelNarration,
    clearGuidedTimers,
    clearNarrationTimers,
    scheduleNarration,
    soundEnabled,
  ]);

  const handleGuidedNext = useCallback(() => {
    const guidedStore = useGuidedDemoStore.getState();
    if (!guidedStore.nextGuidedDemoStep()) return;
    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    const nextIndex = useGuidedDemoStore.getState().currentStepIndex;
    const nextStep = getGuidedDemoStep(nextIndex);
    applyGuidedSnapshot(nextIndex, "intro");
    setGuidedMascotState(getGuidedDemoIntroMooloState(nextStep.id));
    setDemoMessage(`${nextStep.shortLabel} is ready.`);
    scheduleNarration(
      () => {
        const latest = useGuidedDemoStore.getState();
        if (
          !latest.active ||
          latest.currentStepIndex !== nextIndex ||
          latest.phase !== "intro"
        ) {
          return null;
        }
        return getGuidedDemoNarration(
          nextIndex,
          "intro",
          useLocaleStore.getState().locale,
        );
      },
      260,
    );
  }, [
    applyGuidedSnapshot,
    cancelNarration,
    clearGuidedTimers,
    clearNarrationTimers,
    scheduleNarration,
  ]);

  const handleGuidedPrevious = useCallback(() => {
    const guidedStore = useGuidedDemoStore.getState();
    if (!guidedStore.previousGuidedDemoStep()) return;
    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    stopActiveDemoCue();
    const previousIndex =
      useGuidedDemoStore.getState().currentStepIndex;
    const previousStep = getGuidedDemoStep(previousIndex);
    applyGuidedSnapshot(previousIndex, "intro");
    setGuidedMascotState(
      getGuidedDemoIntroMooloState(previousStep.id),
    );
    setDemoMessage(
      `${previousStep.shortLabel} restored to its deterministic intro state.`,
    );
    scheduleNarration(
      () => {
        const latest = useGuidedDemoStore.getState();
        if (
          !latest.active ||
          latest.currentStepIndex !== previousIndex ||
          latest.phase !== "intro"
        ) {
          return null;
        }
        return getGuidedDemoNarration(
          previousIndex,
          "intro",
          useLocaleStore.getState().locale,
        );
      },
      260,
    );
  }, [
    applyGuidedSnapshot,
    cancelNarration,
    clearGuidedTimers,
    clearNarrationTimers,
    scheduleNarration,
  ]);

  const handleGuidedFinish = useCallback(() => {
    if (!useGuidedDemoStore.getState().finishGuidedDemo()) return;
    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    applyGuidedSnapshot(5, "complete");
    setGuidedMascotState("safe");
    setDemoMessage("Guided Demo complete. Six of six stories finished.");
    scheduleNarration(
      () =>
        getGuidedDemoNarration(
          5,
          "complete",
          useLocaleStore.getState().locale,
        ),
      120,
    );
  }, [
    applyGuidedSnapshot,
    cancelNarration,
    clearGuidedTimers,
    clearNarrationTimers,
    scheduleNarration,
  ]);

  const handleGuidedExit = useCallback(() => {
    clearGuidedTimers();
    clearNarrationTimers();
    cancelNarration();
    stopActiveDemoCue();
    useGuidedDemoStore.getState().exitGuidedDemo();
    const safeState = createInitialWalletData();
    useWalletStore.setState({
      ...safeState,
      screen: "wallet",
      hasHydrated: true,
    });
    setExperience(null);
    setMobileDemoOpen(false);
    setGuidedMascotState("safe");
    setDemoMessage("Guided Demo exited. The safe demo wallet is ready.");
  }, [cancelNarration, clearGuidedTimers, clearNarrationTimers]);

  const getCurrentNarration = useCallback(() => {
    const current = useGuidedDemoStore.getState();
    return getGuidedDemoNarration(
      current.currentStepIndex,
      current.phase,
      useLocaleStore.getState().locale,
    );
  }, []);

  const handleNarrationToggle = useCallback(() => {
    toggleNarration(getCurrentNarration() ?? undefined);
  }, [getCurrentNarration, toggleNarration]);

  const handleNarrationReplay = useCallback(() => {
    const text = getCurrentNarration();
    if (text) replayNarration(text);
  }, [getCurrentNarration, replayNarration]);

  const handleScenario = (scenario: DemoScenario) => {
    if (useGuidedDemoStore.getState().active) {
      setDemoMessage("Exit Guided Demo to run individual scenarios.");
      return;
    }
    if (soundEnabled) {
      playDemoCue(
        scenario === "phishing" ||
          scenario === "contract" ||
          scenario === "compromise"
          ? "warning"
          : "launch",
      );
    }
    if (
      protectionState !== "Protected" &&
      scenario !== "compromise"
    ) {
      setDemoMessage("Recover or reset the frozen wallet before starting another scenario.");
      return;
    }
    if (
      pendingTransfer &&
      scenario !== "guardian" &&
      scenario !== "compromise"
    ) {
      setDemoMessage("Finish, cancel, or send the pending transfer to a guardian first.");
      return;
    }
    setMobileDemoOpen(false);

    if (scenario === "compromise" && protectionState !== "Protected") {
      setActiveScenario(scenario);
      setDemoMessage(`${SCENARIO_LABELS[scenario].title} opened.`);
      const frozenTransaction =
        useWalletStore
          .getState()
          .activity.find((item) => item.status === "Frozen") ??
        createScenarioTransaction(scenario);
      setExperience({ kind: "frozen", transaction: frozenTransaction });
      return;
    }

    const transaction = createScenarioTransaction(scenario);
    if (transaction.amount > balances[transaction.token]) {
      setDemoMessage(
        `${SCENARIO_LABELS[scenario].title} needs ${transaction.amount.toLocaleString()} ${transaction.token}. Reset the demo to restore the starting balance.`,
      );
      return;
    }
    setActiveScenario(scenario);
    setDemoMessage(`${SCENARIO_LABELS[scenario].title} opened.`);
    const assessment = {
      score: transaction.riskScore,
      level: transaction.riskLevel,
      reasons: transaction.reasons,
      decision:
        transaction.riskLevel === "Critical"
          ? ("block" as const)
          : transaction.riskLevel === "High"
            ? ("timelock" as const)
            : transaction.riskLevel === "Medium"
              ? ("review" as const)
              : ("allow" as const),
    };

    if (
      scenario === "normal" ||
      scenario === "large" ||
      scenario === "phishing"
    ) {
      setExperience({ kind: "analyze", transaction, assessment });
      return;
    }

    if (scenario === "contract") {
      addActivity(transaction);
      setExperience({ kind: "contract", transaction });
      return;
    }

    if (scenario === "agent") {
      addActivity(transaction);
      setExperience({ kind: "agent", transaction });
      return;
    }

    if (scenario === "compromise") {
      freezeWallet(transaction);
      setExperience({ kind: "frozen", transaction });
      return;
    }

    if (!pendingTransfer) {
      const started = startTimeLock(transaction);
      if (!started) {
        setDemoMessage("The guardian request could not start until the current flow is resolved.");
        return;
      }
      setAwaitingGuardian();
    } else if (pendingTransfer.transaction.status !== "Awaiting Guardian") {
      setAwaitingGuardian();
    }
    setExperience({ kind: "guardian" });
  };

  const handleReset = () => {
    clearNarrationTimers();
    cancelNarration();
    if (soundEnabled) playDemoCue("reset");
    setMobileDemoOpen(false);
    setExperience({ kind: "reset-confirm" });
  };

  useEffect(() => {
    clearNarrationTimers();
  }, [clearNarrationTimers, locale]);

  const handleSoundToggle = () => {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      if (next) playDemoCue("launch");
      return next;
    });
  };

  useEffect(() => {
    if (!guidedActive) return;
    const handleGuidedEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      handleGuidedExit();
    };
    document.addEventListener("keydown", handleGuidedEscape, true);
    return () =>
      document.removeEventListener("keydown", handleGuidedEscape, true);
  }, [guidedActive, handleGuidedExit]);

  useEffect(() => {
    if (!mobileDemoOpen) return;
    const sheet = mobileSheetRef.current;
    const trigger = mobileTriggerRef.current;
    if (!sheet) return;
    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileDemoOpen(false);
        return;
      }
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [mobileDemoOpen]);

  const guidedStep = getGuidedDemoStep(guidedStepIndex);
  const guidedHighlightVisible =
    guidedActive &&
    (guidedPhase === "running" || guidedPhase === "result");
  const hasGuidedHighlight = (
    target: (typeof guidedStep.highlightTargets)[number],
  ) =>
    guidedHighlightVisible &&
    guidedStep.highlightTargets.includes(target);

  return (
    <main
      className="wallet-page"
      data-guided-demo={guidedActive ? "active" : "inactive"}
      data-guided-phase={guidedPhase}
    >
      <TimeLockMonitor />
      <SimulationNotice />
      <div className="wallet-layout">
        <section className="wallet-frame">
          <header className="wallet-header">
            <Brand compact showMascot={false} />
            <button
              className="network-label rialo-network-button"
              type="button"
              onClick={() => setExperience({ kind: "architecture" })}
              aria-label={t("Open Rialo architecture overview")}
            >
              <RialoMark size="small" />
              <span className="rialo-network-copy">
                <strong>{t("Rialo Concept Demo")}</strong>
                <small>{t("Architecture simulation")}</small>
              </span>
            </button>
            <div className="wallet-header-actions">
              <button
                ref={mobileTriggerRef}
                className="icon-button mobile-demo-trigger"
                type="button"
                onClick={() => setMobileDemoOpen(true)}
                aria-label={t("Open demo menu")}
              >
                <Menu size={19} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label={t("Open security settings")}
                onClick={() => setView("shield")}
              >
                <Settings2 size={19} />
              </button>
            </div>
          </header>

          <section
            className={`account-strip ${hasGuidedHighlight("wallet-status") ? "guided-highlight" : ""}`}
          >
            <div className="account-avatar">D1</div>
            <div className="account-identity">
              <span>{t("Demo Account 1")}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                aria-label={t("Copy demo account address")}
              >
                <code>{shortAddress(walletAddress)}</code>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <StatusBadge value={protectionState} />
          </section>

          {guidedActive &&
            guidedStep.id === "large-transfer" &&
            guidedPhase === "result" && (
              <div
                className={`guided-wallet-status guided-security-delay ${hasGuidedHighlight("security-delay") ? "guided-highlight" : ""}`}
                role="status"
              >
                <Clock3 size={18} aria-hidden="true" />
                <span>
                  <strong>{t("Security Delay Active")}</strong>
                  {tx(
                    "Simulated 30-second review window · no waiting required",
                  )}
                </span>
                <StatusBadge value="Timelocked" />
              </div>
            )}

          {protectionState !== "Protected" && (
            <button
              className="freeze-banner"
              type="button"
              onClick={() =>
                handleScenario("compromise")
              }
            >
              <LockKeyhole size={18} aria-hidden="true" />
              <span>
                <strong>
                  {protectionState === "Recovering"
                    ? t("Recovery in progress")
                    : t("Wallet frozen")}
                </strong>
                {protectionState === "Recovering"
                  ? t(
                      "Open the recovery flow to finish protecting the new wallet.",
                    )
                  : t(
                      "Abnormal behavior detected. Start recovery to restore access.",
                    )}
              </span>
              <ChevronRight size={17} />
            </button>
          )}

          {pendingTransfer && (
            <button
              className="pending-banner"
              type="button"
              onClick={() =>
                setExperience({
                  kind:
                    pendingTransfer.transaction.status === "Awaiting Guardian"
                      ? "guardian"
                      : "timelock",
                })
              }
            >
              <Clock3 size={18} aria-hidden="true" />
              <span>
                <strong>{tx(pendingTransfer.transaction.status)}</strong>
                {formatNumber(pendingTransfer.transaction.amount)}{" "}
                {pendingTransfer.transaction.token}{" "}
                {tx("is protected by Moolo.")}
              </span>
              <ChevronRight size={17} />
            </button>
          )}

          {view !== "send" && (
            <section className="balance-section">
              <span className="balance-label">
                {t("Total portfolio")}
                <Eye size={15} aria-hidden="true" />
              </span>
              <h1>{formatCurrency(totalBalance)}</h1>
              <div className="portfolio-change">
                <span>+2.4%</span>
                {t("Simulated today")}
              </div>
            </section>
          )}

          {view !== "send" && (
            <section
              className={`wallet-actions ${hasGuidedHighlight("wallet-actions") ? "guided-highlight" : ""}`}
              aria-label={t("Wallet actions")}
            >
              <ActionButton
                icon={Send}
                label={t("Send")}
                primary
                disabled={protectionState !== "Protected"}
                onClick={() => setView("send")}
              />
              <ActionButton
                icon={ArrowDownToLine}
                label={t("Receive")}
                onClick={() => setExperience({ kind: "receive" })}
              />
              <ActionButton
                icon={RefreshCw}
                label={t("Swap")}
                disabled={protectionState !== "Protected"}
                onClick={() => setExperience({ kind: "swap" })}
              />
              <ActionButton
                icon={Shield}
                label={t("Shield")}
                onClick={() => setView("shield")}
              />
            </section>
          )}

          {view === "send" ? (
            <SendView
              onCancel={() => setView("tokens")}
              onAnalyze={(transaction, assessment) =>
                setExperience({ kind: "analyze", transaction, assessment })
              }
            />
          ) : (
            <>
              <nav className="wallet-tabs" aria-label={t("Wallet")}>
                {tabItems.map(({ id, label, icon: Icon }) => (
                  <button
                    className={view === id ? "active" : ""}
                    type="button"
                    key={id}
                    onClick={() => setView(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {tx(label)}
                  </button>
                ))}
              </nav>
              <AnimatePresence mode="wait">
                <motion.div
                  className={`wallet-content ${hasGuidedHighlight("activity-list") ? "guided-highlight" : ""}`}
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {view === "tokens" && <TokensView />}
                  {view === "activity" && (
                    <ActivityView
                      onSelect={(transaction) =>
                        setExperience({ kind: "activity", transaction })
                      }
                    />
                  )}
                  {view === "shield" && (
                    <ShieldView
                      onFreeze={() => handleScenario("compromise")}
                      onArchitecture={() =>
                        setExperience({ kind: "architecture" })
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          <footer className="wallet-footer">
            <span className="wallet-footer-rialo">
              {t("Designed for Rialo")}
            </span>
            <span>{t("Architecture simulation only")}</span>
          </footer>
        </section>

        <DemoPanel
          onScenario={handleScenario}
          onReset={handleReset}
          activeScenario={activeScenario}
          protectionState={protectionState}
          pendingStatus={pendingTransfer?.transaction.status ?? null}
          message={demoMessage}
          busy={experience !== null || guidedPhase === "running"}
          soundEnabled={soundEnabled}
          onSoundToggle={handleSoundToggle}
          guidedMascotState={guidedMascotState}
          onGuidedStart={handleGuidedStart}
          onGuidedRun={handleGuidedRun}
          onGuidedNext={handleGuidedNext}
          onGuidedPrevious={handleGuidedPrevious}
          onGuidedFinish={handleGuidedFinish}
          onGuidedExit={handleGuidedExit}
          narrationEnabled={narrationEnabled}
          narrationStatus={narrationStatus}
          narrationSupported={narrationSupported}
          onNarrationToggle={handleNarrationToggle}
          onNarrationReplay={handleNarrationReplay}
          onNarrationPause={pauseNarration}
          onNarrationResume={resumeNarration}
        />
      </div>

      <AnimatePresence>
        {experience && (
          <SecurityExperience
            experience={experience}
            onClose={() => setExperience(null)}
            onChange={setExperience}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileDemoOpen && (
          <motion.div
            className="mobile-demo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={mobileSheetRef}
              className="mobile-demo-sheet"
              role="dialog"
              aria-modal="true"
              aria-label={t("Demo Control Panel")}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
            >
              <button
                className="icon-button mobile-sheet-close"
                type="button"
                aria-label={t("Close demo menu")}
                onClick={() => setMobileDemoOpen(false)}
              >
                <X size={19} />
              </button>
              <DemoPanel
                mobile
                onScenario={handleScenario}
                onReset={handleReset}
                activeScenario={activeScenario}
                protectionState={protectionState}
                pendingStatus={pendingTransfer?.transaction.status ?? null}
                message={demoMessage}
                busy={experience !== null || guidedPhase === "running"}
                soundEnabled={soundEnabled}
                onSoundToggle={handleSoundToggle}
                guidedMascotState={guidedMascotState}
                onGuidedStart={handleGuidedStart}
                onGuidedRun={handleGuidedRun}
                onGuidedNext={handleGuidedNext}
                onGuidedPrevious={handleGuidedPrevious}
                onGuidedFinish={handleGuidedFinish}
                onGuidedExit={handleGuidedExit}
                narrationEnabled={narrationEnabled}
                narrationStatus={narrationStatus}
                narrationSupported={narrationSupported}
                onNarrationToggle={handleNarrationToggle}
                onNarrationReplay={handleNarrationReplay}
                onNarrationPause={pauseNarration}
                onNarrationResume={resumeNarration}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite">
        {copied ? tx("Demo wallet address copied.") : tx(demoMessage)}
      </div>
    </main>
  );
}

function TimeLockMonitor() {
  const pending = useWalletStore((state) => state.pendingTransfer);
  const completeTimeLock = useWalletStore((state) => state.completeTimeLock);

  useEffect(() => {
    if (!pending || pending.transaction.status !== "Timelocked") return;
    const delay = Math.max(0, pending.endsAt - Date.now());
    const timer = window.setTimeout(
      completeTimeLock,
      Math.min(delay, 2_147_000_000),
    );
    return () => window.clearTimeout(timer);
  }, [completeTimeLock, pending]);

  return null;
}

function TokensView() {
  const { t, tx, formatCurrency, formatNumber } = useTranslation();
  const balances = useWalletStore((state) => state.balances);
  return (
    <div className="token-list">
      {TOKENS.map((token) => (
        <div className="token-row" key={token.symbol}>
          <span
            className={`token-icon ${token.symbol === "RLO" ? "token-icon-rialo" : ""}`}
            style={{ "--token-color": token.accent } as React.CSSProperties}
          >
            {token.symbol.slice(0, 1)}
          </span>
          <div className="token-name">
            <strong>{tx(token.name)}</strong>
            <span>{token.symbol}</span>
          </div>
          <div className="token-balance">
            <strong>
              {formatNumber(balances[token.symbol], {
                maximumFractionDigits: 4,
              })}
            </strong>
            <span>
              {formatCurrency(
                balances[token.symbol] * TOKEN_PRICES[token.symbol],
              )}
            </span>
          </div>
          <span className="token-change">+1.8%</span>
        </div>
      ))}
      <div className="guardian-card">
        <ShieldCheck size={22} aria-hidden="true" />
        <div>
          <strong>{t("Moolo is watching quietly")}</strong>
          <span>
            {t(
              "Designed for Rialo architecture simulation and private policy evaluation.",
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityView({
  onSelect,
}: {
  onSelect: (transaction: DemoTransaction) => void;
}) {
  const { t, tx, formatNumber, formatTime } = useTranslation();
  const activity = useWalletStore((state) => state.activity);
  if (activity.length === 0) {
    return (
      <div className="empty-state">
        <FileClock size={26} aria-hidden="true" />
        <strong>{t("No activity yet")}</strong>
        <span>{t("Run a scenario to create a simulated transaction.")}</span>
      </div>
    );
  }
  return (
    <div className="activity-list">
      {activity.map((transaction) => (
        <button
          className="activity-row"
          type="button"
          key={transaction.id}
          onClick={() => onSelect(transaction)}
        >
          <span className={`activity-icon activity-${transaction.status.toLowerCase().replaceAll(" ", "-")}`}>
            {transaction.status === "Confirmed" ? (
              <ArrowUpRight size={17} />
            ) : transaction.status === "Agent Denied" ? (
              <Bot size={17} />
            ) : (
              <Shield size={17} />
            )}
          </span>
          <div className="activity-name">
            <strong>{tx(transaction.type)}</strong>
            <span>
              {formatTime(transaction.createdAt)}
            </span>
          </div>
          <div className="activity-amount">
            <strong>
              {transaction.amount > 0
                ? `${formatNumber(transaction.amount)} ${transaction.token}`
                : tx("Security event")}
            </strong>
            <StatusBadge value={transaction.status} />
          </div>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ShieldView({
  onFreeze,
  onArchitecture,
}: {
  onFreeze: () => void;
  onArchitecture: () => void;
}) {
  const { t, tx } = useTranslation();
  const settings = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const protectionState = useWalletStore((state) => state.protectionState);
  const [saveMessage, setSaveMessage] = useState("");

  const saveSettings = (next: Parameters<typeof updateSettings>[0]) => {
    updateSettings(next);
    setSaveMessage("Protection settings saved in this browser.");
    window.setTimeout(() => setSaveMessage(""), 1800);
  };

  const toggles: Array<{
    key:
      | "protectionEnabled"
      | "blockSuspiciousAddresses"
      | "protectNewAddresses"
      | "emergencyFreeze";
    label: string;
    description: string;
  }> = [
    {
      key: "protectionEnabled",
      label: "Moolo Protection",
      description: "Run every simulated request through the risk engine.",
    },
    {
      key: "blockSuspiciousAddresses",
      label: "Block suspicious addresses",
      description: "Stop known malicious recipients automatically.",
    },
    {
      key: "protectNewAddresses",
      label: "Protect new addresses",
      description: "Add extra review for recipients without history.",
    },
    {
      key: "emergencyFreeze",
      label: "Emergency Freeze",
      description: "Pause sending when compromise signals appear.",
    },
  ];

  const numericSettings: Array<{
    key:
      | "largeTransferLimit"
      | "timeLockSeconds"
      | "guardianThreshold"
      | "aiAgentDailyLimit";
    label: string;
    suffix: string;
    min: number;
  }> = [
    {
      key: "largeTransferLimit",
      label: "Large Transfer Limit",
      suffix: "USDC",
      min: 1,
    },
    {
      key: "timeLockSeconds",
      label: "Time Lock Duration",
      suffix: "sec",
      min: 5,
    },
    {
      key: "guardianThreshold",
      label: "Guardian Approval Threshold",
      suffix: "USDC",
      min: 1,
    },
    {
      key: "aiAgentDailyLimit",
      label: "AI Agent Daily Limit",
      suffix: "USDC",
      min: 1,
    },
  ];

  return (
    <div className="shield-settings">
      <div className="shield-overview">
        <MooloMascot
          state={protectionState === "Frozen" ? "frozen" : "guard"}
          size="medium"
        />
        <div>
          <span className="eyebrow">{t("Protection center")}</span>
          <strong>
            {settings.protectionEnabled
              ? t("Your policies are active")
              : t("Optional protection is off")}
          </strong>
          <p>
            {t(
              "These controls only change how the local simulation responds.",
            )}
          </p>
        </div>
        <StatusBadge value={protectionState} />
      </div>
      {!settings.protectionEnabled && (
        <div className="protection-off-note" role="status">
          {tx(
            "Optional spending, new-address, and agent policies are paused. Critical phishing addresses remain blocked for demo safety.",
          )}
        </div>
      )}
      <div className="setting-group">
        {toggles.map((item) => (
          <label className="toggle-row" key={item.key}>
            <span>
              <strong>{tx(item.label)}</strong>
              <small>{tx(item.description)}</small>
            </span>
            <input
              type="checkbox"
              checked={settings[item.key]}
              onChange={(event) =>
                saveSettings({ [item.key]: event.target.checked })
              }
              aria-label={`${tx(item.label)}: ${tx(settings[item.key] ? "on" : "off")}`}
            />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>
      <div className="setting-group numeric-settings">
        {numericSettings.map((item) => (
          <label key={item.key}>
            <span>{tx(item.label)}</span>
            <div>
              <input
                type="number"
                min={item.min}
                value={settings[item.key]}
                onChange={(event) =>
                  saveSettings({
                    [item.key]: Math.max(
                      item.min,
                      Number(event.target.value) || item.min,
                    ),
                  })
                }
                aria-label={tx(item.label)}
              />
              <small>{tx(item.suffix)}</small>
            </div>
          </label>
        ))}
      </div>
      <div className="settings-save-status" aria-live="polite">
        {tx(saveMessage)}
      </div>
      <button
        className="danger-button full-button"
        type="button"
        onClick={onFreeze}
        disabled={!settings.emergencyFreeze}
      >
        <LockKeyhole size={17} aria-hidden="true" />
        {t("Simulate Emergency Freeze")}
      </button>
      <section className="why-rialo-card">
        <div className="why-rialo-heading">
          <div>
            <span className="eyebrow">{t("Rialo Concept Demo")}</span>
            <strong>{t("Why Rialo?")}</strong>
            <p>
              {t(
                "Moolo combines multiple Rialo-native concepts into one wallet protection workflow.",
              )}
            </p>
          </div>
        </div>
        <RialoPrimitiveGrid compact />
        <button
          className="secondary-button full-button"
          type="button"
          onClick={onArchitecture}
        >
          {t("Explore the architecture")}
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
