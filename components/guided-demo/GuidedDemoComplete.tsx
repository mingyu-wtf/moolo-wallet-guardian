"use client";

import { ArrowLeft, RefreshCcw, ShieldCheck } from "lucide-react";
import { GUIDED_DEMO_STEPS } from "@/lib/guided-demo";
import { useTranslation } from "@/hooks/useTranslation";

interface GuidedDemoCompleteProps {
  onRestart: () => void;
  onReturn: () => void;
}

export function GuidedDemoComplete({
  onRestart,
  onReturn,
}: GuidedDemoCompleteProps) {
  const { t, tx } = useTranslation();
  const concepts = Array.from(
    new Set(GUIDED_DEMO_STEPS.map((step) => step.rialoConcept)),
  );

  return (
    <section className="guided-complete" aria-labelledby="guided-complete-title">
      <div className="guided-complete-mark" aria-hidden="true">
        <ShieldCheck size={24} />
      </div>
      <span className="eyebrow">{t("6 / 6 completed")}</span>
      <h3 id="guided-complete-title">{t("The complete security story")}</h3>
      <p>
        {t(
          "Moolo protected, blocked, froze, and recovered the wallet through one connected security story.",
        )}
      </p>
      <div className="guided-complete-summary">
        <strong>{t("Six simulated outcomes")}</strong>
        <ul>
          {GUIDED_DEMO_STEPS.map((step) => (
            <li key={step.id}>
              <span>{tx(step.shortLabel)}</span>
              <small>{tx(step.result)}</small>
            </li>
          ))}
        </ul>
      </div>
      <div className="guided-concept-summary">
        <strong>{t("Rialo concepts explored")}</strong>
        <p>{concepts.join(" · ")}</p>
        <small>{t("Rialo Architecture Simulation only")}</small>
      </div>
      <div className="guided-complete-actions">
        <button className="primary-button" type="button" onClick={onRestart}>
          <RefreshCcw size={16} aria-hidden="true" />
          {t("Restart Demo")}
        </button>
        <button className="secondary-button" type="button" onClick={onReturn}>
          <ArrowLeft size={16} aria-hidden="true" />
          {t("Return to Wallet")}
        </button>
      </div>
    </section>
  );
}
