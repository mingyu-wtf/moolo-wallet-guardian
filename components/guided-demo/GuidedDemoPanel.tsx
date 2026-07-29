"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Play,
  X,
} from "lucide-react";
import { GuidedDemoComplete } from "@/components/guided-demo/GuidedDemoComplete";
import { GuidedDemoNarrationControls } from "@/components/guided-demo/GuidedDemoNarrationControls";
import { GuidedDemoPresenterNote } from "@/components/guided-demo/GuidedDemoPresenterNote";
import { GuidedDemoProgress } from "@/components/guided-demo/GuidedDemoProgress";
import { MooloMascot, type MooloMascotState } from "@/components/moolo/MooloMascot";
import {
  GUIDED_DEMO_SIMULATION_LABEL,
  GUIDED_DEMO_STEPS,
  getGuidedDemoStep,
} from "@/lib/guided-demo";
import { useGuidedDemoStore } from "@/store/guided-demo-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { NarrationStatus } from "@/lib/speech/guided-demo-narrator";

interface GuidedDemoPanelProps {
  mascotState: MooloMascotState;
  onRun: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  onExit: () => void;
  onRestart: () => void;
  narrationEnabled: boolean;
  narrationStatus: NarrationStatus;
  narrationSupported: boolean | null;
  onNarrationToggle: () => void;
  onNarrationReplay: () => void;
  onNarrationPause: () => void;
  onNarrationResume: () => void;
}

export function GuidedDemoPanel({
  mascotState,
  onRun,
  onNext,
  onPrevious,
  onFinish,
  onExit,
  onRestart,
  narrationEnabled,
  narrationStatus,
  narrationSupported,
  onNarrationToggle,
  onNarrationReplay,
  onNarrationPause,
  onNarrationResume,
}: GuidedDemoPanelProps) {
  const { t, tx } = useTranslation();
  const currentStepIndex = useGuidedDemoStore(
    (state) => state.currentStepIndex,
  );
  const phase = useGuidedDemoStore((state) => state.phase);
  const completedSteps = useGuidedDemoStore(
    (state) => state.completedSteps,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = getGuidedDemoStep(currentStepIndex);
  const isLastStep = currentStepIndex === GUIDED_DEMO_STEPS.length - 1;

  useEffect(() => {
    if (phase !== "running") headingRef.current?.focus();
  }, [currentStepIndex, phase]);

  return (
    <section
      className="guided-demo-panel"
      aria-label={t("Guided Demo controls")}
      data-guided-phase={phase}
    >
      <header className="guided-demo-header">
        <div>
          <span className="guided-live-badge">{t("Live")}</span>
          <span>{t("Guided Demo")}</span>
        </div>
        <button
          className="guided-exit-button"
          type="button"
          onClick={onExit}
          aria-label={t("Exit Guided Demo")}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <GuidedDemoNarrationControls
        enabled={narrationEnabled}
        status={narrationStatus}
        supported={narrationSupported}
        replayDisabled={phase === "running" || phase === "inactive"}
        onToggle={onNarrationToggle}
        onReplay={onNarrationReplay}
        onPause={onNarrationPause}
        onResume={onNarrationResume}
      />

      {phase === "complete" ? (
        <GuidedDemoComplete onRestart={onRestart} onReturn={onExit} />
      ) : (
        <>
          <div className="guided-step-count">
            {t("Step {current} of {total}", {
              current: currentStepIndex + 1,
              total: GUIDED_DEMO_STEPS.length,
            })}
          </div>
          <GuidedDemoProgress
            currentStepIndex={currentStepIndex}
            completedSteps={completedSteps}
          />

          <div className="guided-story">
            <div className="guided-story-heading">
              <div>
                <span className="eyebrow">{t("Current story")}</span>
                <h3 ref={headingRef} tabIndex={-1}>
                  {tx(step.title)}
                </h3>
              </div>
              <MooloMascot state={mascotState} size="medium" />
            </div>
            <p>{tx(step.description)}</p>

            {phase === "running" && (
              <div className="guided-running-status" role="status">
                <LoaderCircle size={17} aria-hidden="true" />
                {t("Processing local simulation…")}
              </div>
            )}

            {phase === "result" && (
              <div className="guided-result" aria-live="polite">
                <div className="guided-result-badge">
                  <Check size={15} aria-hidden="true" />
                  {tx(step.result)}
                </div>
                <dl>
                  {step.details.map((detail) => (
                    <div key={detail.label}>
                      <dt>{tx(detail.label)}</dt>
                      <dd>{tx(detail.value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="guided-rialo-concept">
              <span>{t("Rialo concept simulation")}</span>
              <strong>{step.rialoConcept}</strong>
              <p>{tx(step.rialoDescription)}</p>
              <small>{tx(GUIDED_DEMO_SIMULATION_LABEL)}</small>
            </div>
          </div>

          <div
            className="guided-controls"
            aria-label={t("Guided Demo navigation")}
          >
            <button
              className="secondary-button"
              type="button"
              onClick={onPrevious}
              disabled={currentStepIndex === 0 || phase === "running"}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t("Previous")}
            </button>
            {phase === "intro" || phase === "running" ? (
              <button
                className="primary-button guided-run-button"
                type="button"
                onClick={onRun}
                disabled={phase === "running"}
              >
                {phase === "running" ? (
                  <LoaderCircle size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {phase === "running" ? t("Running…") : t("Run Step")}
              </button>
            ) : isLastStep ? (
              <button
                className="primary-button guided-run-button"
                type="button"
                onClick={onFinish}
                disabled={phase !== "result"}
              >
                {t("Finish Guided Demo")}
              </button>
            ) : (
              <button
                className="primary-button guided-run-button"
                type="button"
                onClick={onNext}
                disabled={phase !== "result"}
              >
                {t("Next")}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <GuidedDemoPresenterNote
            note={step.presenterNote}
            talkingPoints={step.talkingPoints}
          />

          <div className="guided-next-story">
            {isLastStep
              ? t("Next: review the complete security story.")
              : t("Next: {label}", {
                  label: tx(
                    GUIDED_DEMO_STEPS[currentStepIndex + 1].shortLabel,
                  ),
                })}
          </div>
          <button
            className="guided-exit-text"
            type="button"
            onClick={onExit}
          >
            {t("Exit Demo")}
          </button>
        </>
      )}
      <div className="sr-only" aria-live="polite">
        {phase === "complete"
          ? t("Guided Demo complete. Six of six steps finished.")
          : t("Step {current} of six, {title}, {phase}.", {
              current: currentStepIndex + 1,
              title: tx(step.title),
              phase: tx(phase),
            })}
      </div>
    </section>
  );
}
