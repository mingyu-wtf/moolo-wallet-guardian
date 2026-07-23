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
import { SCENARIO_LABELS } from "@/lib/constants";
import type { DemoScenario } from "@/types";

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
  mobile?: boolean;
}

export function DemoPanel({
  onScenario,
  onReset,
  mobile = false,
}: DemoPanelProps) {
  return (
    <aside className={`demo-panel ${mobile ? "demo-panel-mobile" : ""}`}>
      <div className="demo-panel-heading">
        <div>
          <span className="eyebrow">Presenter tools</span>
          <h2>Demo Control Panel</h2>
        </div>
        <span className="live-dot">Live</span>
      </div>
      <p className="demo-panel-copy">
        Launch a security story instantly. Every result stays safely inside this
        browser.
      </p>
      <div className="scenario-list">
        {scenarios.map(({ id, icon: Icon }) => (
          <button
            className="scenario-button"
            key={id}
            type="button"
            onClick={() => onScenario(id)}
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
      <button className="reset-button" type="button" onClick={onReset}>
        <RefreshCcw size={16} aria-hidden="true" />
        Reset Demo
      </button>
    </aside>
  );
}
