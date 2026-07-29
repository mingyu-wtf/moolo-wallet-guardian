"use client";

import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { NarrationStatus } from "@/lib/speech/guided-demo-narrator";

interface GuidedDemoNarrationControlsProps {
  enabled: boolean;
  status: NarrationStatus;
  supported: boolean | null;
  replayDisabled?: boolean;
  onToggle: () => void;
  onReplay: () => void;
  onPause: () => void;
  onResume: () => void;
}

export function GuidedDemoNarrationControls({
  enabled,
  status,
  supported,
  replayDisabled = false,
  onToggle,
  onReplay,
  onPause,
  onResume,
}: GuidedDemoNarrationControlsProps) {
  const { t } = useTranslation();
  const isSpeaking = status === "speaking";
  const isPaused = status === "paused";
  const unavailable = supported === false || status === "unavailable";

  const statusMessage = unavailable
    ? t("Narration is not available in this browser.")
    : status === "error"
      ? t(
          "Narration could not be played. You can continue using the on-screen guidance.",
        )
      : isSpeaking
        ? t("Speaking")
        : isPaused
          ? t("Narration paused")
          : "";

  return (
    <section
      className="guided-narration"
      aria-label={t("Narration")}
      data-narration-status={status}
    >
      <div className="guided-narration-heading">
        <span>{t("Narration")}</span>
        {isSpeaking && (
          <span className="guided-narration-speaking">
            <i aria-hidden="true" />
            {t("Speaking")}
          </span>
        )}
      </div>
      {unavailable ? (
        <p className="guided-narration-message">{statusMessage}</p>
      ) : (
        <div className="guided-narration-actions">
          <button
            type="button"
            className="guided-narration-toggle"
            onClick={onToggle}
            aria-label={t(enabled ? "Narration on" : "Narration off")}
            aria-pressed={enabled}
            title={t(enabled ? "Narration on" : "Narration off")}
          >
            {enabled ? (
              <Volume2 size={14} aria-hidden="true" />
            ) : (
              <VolumeX size={14} aria-hidden="true" />
            )}
            {t(enabled ? "Narration on" : "Narration off")}
          </button>
          <button
            type="button"
            onClick={onReplay}
            disabled={!enabled || replayDisabled}
            aria-label={t("Replay narration")}
            title={t("Replay narration")}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("Replay narration")}
          </button>
          {(isSpeaking || isPaused) && (
            <button
              type="button"
              onClick={isPaused ? onResume : onPause}
              aria-label={t(isPaused ? "Resume" : "Pause")}
              aria-pressed={isPaused}
              title={t(isPaused ? "Resume" : "Pause")}
            >
              {isPaused ? (
                <Play size={14} aria-hidden="true" />
              ) : (
                <Pause size={14} aria-hidden="true" />
              )}
              {t(isPaused ? "Resume" : "Pause")}
            </button>
          )}
        </div>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
    </section>
  );
}
