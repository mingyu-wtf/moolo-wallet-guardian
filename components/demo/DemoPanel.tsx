"use client";

import {
  Bot,
  FileWarning,
  HandCoins,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRoundCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { RialoMark } from "@/components/rialo/RialoMark";
import { SCENARIO_LABELS } from "@/lib/constants";
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
}: DemoPanelProps) {
  const isFrozen = protectionState !== "Protected";
  const scenarioDisabled = (scenario: DemoScenario) =>
    busy ||
    (isFrozen && scenario !== "compromise") ||
    Boolean(pendingStatus && scenario !== "guardian" && scenario !== "compromise");

  return (
    <aside
      className={`demo-panel ${mobile ? "demo-panel-mobile" : ""}`}
      aria-label="Demo scenario controls"
    >
      <div className="demo-panel-heading">
        <div>
          <span className="eyebrow">Presenter tools</span>
          <h2>Demo Control Panel</h2>
        </div>
        <div className="demo-panel-signals">
          <span className="live-dot">Live</span>
          <span className="demo-rialo-mark" title="Designed for Rialo">
            <RialoMark size="small" />
          </span>
          <button
            className="sound-toggle"
            type="button"
            onClick={onSoundToggle}
            aria-label={`Turn demo sound ${soundEnabled ? "off" : "on"}`}
            aria-pressed={soundEnabled}
            title={`Demo sound ${soundEnabled ? "on" : "off"}`}
          >
            {soundEnabled ? (
              <Volume2 size={15} aria-hidden="true" />
            ) : (
              <VolumeX size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p className="demo-panel-copy">
        Launch a security story instantly. Every result stays safely inside this
        browser.
      </p>
      <dl className="demo-state-grid" aria-label="Current demo state">
        <div>
          <dt>Wallet</dt>
          <dd>{protectionState}</dd>
        </div>
        <div>
          <dt>Pending</dt>
          <dd>{pendingStatus ?? "None"}</dd>
        </div>
        <div>
          <dt>Scenario</dt>
          <dd>
            {activeScenario
              ? SCENARIO_LABELS[activeScenario].title
              : "Ready"}
          </dd>
        </div>
      </dl>
      {message && (
        <p className="demo-panel-message" role="status">
          {message}
        </p>
      )}
      {activeScenario && (
        <div
          className="presenter-flow"
          role="status"
          aria-label={`${SCENARIO_LABELS[activeScenario].title}: simulated Rialo workflow active`}
        >
          <span className="presenter-flow-title">
            <RialoMark size="small" />
            Simulated Rialo Workflow
          </span>
          <ol>
            <li>Inspect</li>
            <li>Evaluate policy</li>
            <li>Resolve safely</li>
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
                ? "Finish or cancel the current protected flow first."
                : undefined
            }
            data-testid={`scenario-${id}`}
          >
            <span className={`scenario-icon scenario-${id}`}>
              <Icon size={17} aria-hidden="true" />
            </span>
            <span>
              <strong>{SCENARIO_LABELS[id].title}</strong>
              <small>{SCENARIO_LABELS[id].description}</small>
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
        Reset Demo
      </button>
    </aside>
  );
}
