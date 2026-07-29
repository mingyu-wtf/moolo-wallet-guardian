"use client";

import { Check } from "lucide-react";
import {
  GUIDED_DEMO_STEPS,
  type GuidedDemoStepId,
} from "@/lib/guided-demo";
import { useTranslation } from "@/hooks/useTranslation";

interface GuidedDemoProgressProps {
  currentStepIndex: number;
  completedSteps: GuidedDemoStepId[];
}

export function GuidedDemoProgress({
  currentStepIndex,
  completedSteps,
}: GuidedDemoProgressProps) {
  const { t, tx } = useTranslation();
  return (
    <ol className="guided-progress" aria-label={t("Guided Demo progress")}>
      {GUIDED_DEMO_STEPS.map((step, index) => {
        const completed = completedSteps.includes(step.id);
        const current = index === currentStepIndex;
        return (
          <li
            key={step.id}
            className={`${completed ? "is-complete" : ""} ${current ? "is-current" : ""}`}
            aria-current={current ? "step" : undefined}
            aria-label={t("Step {current}: {label}", {
              current: index + 1,
              label: tx(step.shortLabel),
            })}
          >
            <span aria-hidden="true">
              {completed ? <Check size={12} strokeWidth={3} /> : index + 1}
            </span>
            <small>{tx(step.shortLabel)}</small>
          </li>
        );
      })}
    </ol>
  );
}
