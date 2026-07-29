"use client";

import {
  Bot,
  FileWarning,
  HandCoins,
  Play,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GuidedDemoPanel } from "@/components/guided-demo/GuidedDemoPanel";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import type { MooloMascotState } from "@/components/moolo/MooloMascot";
import { SCENARIO_LABELS } from "@/lib/constants";
import { useGuidedDemoStore } from "@/store/guided-demo-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { NarrationStatus } from "@/lib/speech/guided-demo-narrator";
import type {
  DemoScenario,
  TransactionStatus,
  WalletProtectionState,
} from "@/types";

const scenarios: Array<{
  id: DemoScenario;
  icon: typeof ShieldCheck;
}> = [
  { id: "normal", icon: ShieldCheck },
  { id: "large", icon: HandCoins },
  { id: "phishing", icon: TriangleAlert },
  { id: "contract", icon: FileWarning },
  { id: "agent", icon: Bot },
  { id: "compromise", icon: ShieldAlert },
  { id: "guardian", icon: UserRoundCheck },
];

interface DemoPanelProps {
  onScenario: (scenario: DemoScenario) => void;
  onReset: () => void;
  activeScenario: DemoScenario | null;
  protectionState: WalletProtectionState;
  pendingStatus: TransactionStatus | null;
  message?: string;
  busy?: boolean;
  mobile?: boolean;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  guidedMascotState: MooloMascotState;
  onGuidedStart: () => void;
  onGuidedRun: () => void;
  onGuidedNext: () => void;
  onGuidedPrevious: () => void;
  onGuidedFinish: () => void;
  onGuidedExit: () => void;
  narrationEnabled: boolean;
  narrationStatus: NarrationStatus;
  narrationSupported: boolean | null;
  onNarrationToggle: () => void;
  onNarrationReplay: () => void;
  onNarrationPause: () => void;
  onNarrationResume: () => void;
}

export function DemoPanel({
  onScenario,
  onReset,
  activeScenario,
  protectionState,
  pendingStatus,
  message,
  busy = false,
  mobile = false,
  soundEnabled,
  onSoundToggle,
  guidedMascotState,
  onGuidedStart,
  onGuidedRun,
  onGuidedNext,
  onGuidedPrevious,
  onGuidedFinish,
  onGuidedExit,
  narrationEnabled,
  narrationStatus,
  narrationSupported,
  onNarrationToggle,
  onNarrationReplay,
  onNarrationPause,
  onNarrationResume,
}: DemoPanelProps) {
  const { t, tx } = useTranslation();
  const guidedActive = useGuidedDemoStore((state) => state.active);
  const isFrozen = protectionState !== "Protected";
  const scenarioDisabled = (scenario: DemoScenario) =>
    busy ||
    guidedActive ||
    (isFrozen && scenario !== "compromise") ||
    Boolean(pendingStatus && scenario !== "guardian" && scenario !== "compromise");

  return (
    <aside
      className={`demo-panel ${mobile ? "demo-panel-mobile" : ""}`}
      aria-label={t("Presenter tools")}
    >
      <div className="demo-panel-heading">
        <div>
          <span className="eyebrow">{t("Presenter tools")}</span>
          <h2>{t("Demo Control Panel")}</h2>
        </div>
        <div className="demo-panel-signals">
          <span className="live-dot">{t("Live")}</span>
          <span className="demo-rialo-mark" title={t("Designed for Rialo")}>
            {t("Designed for Rialo")}
          </span>
          <button
            className="sound-toggle"
            type="button"
            onClick={onSoundToggle}
            aria-label={t(
              soundEnabled ? "Turn demo sound off" : "Turn demo sound on",
            )}
            aria-pressed={soundEnabled}
            title={t(soundEnabled ? "Demo sound on" : "Demo sound off")}
          >
            {soundEnabled ? (
              <Volume2 size={15} aria-hidden="true" />
            ) : (
              <VolumeX size={15} aria-hidden="true" />
            )}
          </button>
          <LanguageSwitcher compact />
        </div>
      </div>
      <p className="demo-panel-copy">
        {t(
          "Launch a security story instantly. Every result stays safely inside this browser.",
        )}
      </p>
      {guidedActive ? (
        <GuidedDemoPanel
          mascotState={guidedMascotState}
          onRun={onGuidedRun}
          onNext={onGuidedNext}
          onPrevious={onGuidedPrevious}
          onFinish={onGuidedFinish}
          onExit={onGuidedExit}
          onRestart={onGuidedStart}
          narrationEnabled={narrationEnabled}
          narrationStatus={narrationStatus}
          narrationSupported={narrationSupported}
          onNarrationToggle={onNarrationToggle}
          onNarrationReplay={onNarrationReplay}
          onNarrationPause={onNarrationPause}
          onNarrationResume={onNarrationResume}
        />
      ) : (
        <button
          className="guided-start-button"
          type="button"
          onClick={onGuidedStart}
          disabled={busy}
          data-testid="start-guided-demo"
        >
          <span className="guided-start-icon">
            <Play size={18} fill="currentColor" aria-hidden="true" />
          </span>
          <span>
            <strong>{t("Start Guided Demo")}</strong>
            <small>
              {t(
                "Run the complete Moolo security story in six guided steps.",
              )}
            </small>
          </span>
        </button>
      )}
      <dl className="demo-state-grid" aria-label={t("Demo Control Panel")}>
        <div>
          <dt>{t("Wallet")}</dt>
          <dd>{tx(protectionState)}</dd>
        </div>
        <div>
          <dt>{t("Pending")}</dt>
          <dd>{pendingStatus ? tx(pendingStatus) : t("None")}</dd>
        </div>
        <div>
          <dt>{t("Scenario")}</dt>
          <dd>
            {activeScenario
              ? tx(SCENARIO_LABELS[activeScenario].title)
              : t("Ready")}
          </dd>
        </div>
      </dl>
      {message && (
        <p className="demo-panel-message" role="status">
          {tx(message)}
        </p>
      )}
      {guidedActive && (
        <p className="guided-scenario-lock" role="status">
          {t("Exit Guided Demo to run individual scenarios.")}
        </p>
      )}
      {activeScenario && !guidedActive && (
        <div
          className="presenter-flow"
          role="status"
          aria-label={`${SCENARIO_LABELS[activeScenario].title}: simulated Rialo workflow active`}
        >
          <span className="presenter-flow-title">
            {t("Simulated Rialo Workflow")}
          </span>
          <ol>
            <li>{t("Inspect")}</li>
            <li>{t("Evaluate policy")}</li>
            <li>{t("Resolve safely")}</li>
          </ol>
        </div>
      )}
      <div className="scenario-list">
        {scenarios.map(({ id, icon: Icon }) => (
          <button
            className={`scenario-button ${activeScenario === id ? "active" : ""}`}
            key={id}
            type="button"
            onClick={() => onScenario(id)}
            disabled={scenarioDisabled(id)}
            aria-pressed={activeScenario === id}
            title={
              scenarioDisabled(id)
                ? guidedActive
                  ? t("Exit Guided Demo to run individual scenarios.")
                  : t("Finish or cancel the current protected flow first.")
                : undefined
            }
            data-testid={`scenario-${id}`}
          >
            <span className={`scenario-icon scenario-${id}`}>
              <Icon size={17} aria-hidden="true" />
            </span>
            <span>
              <strong>{tx(SCENARIO_LABELS[id].title)}</strong>
              <small>{tx(SCENARIO_LABELS[id].description)}</small>
            </span>
          </button>
        ))}
      </div>
      <button
        className="reset-button"
        type="button"
        onClick={onReset}
        disabled={busy}
        data-testid="reset-demo"
      >
        <RefreshCcw size={16} aria-hidden="true" />
        {t("Reset Demo")}
      </button>
    </aside>
  );
}
