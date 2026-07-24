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
            <RialoMark size="mini" />
          </span>
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
