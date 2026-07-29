"use client";

import {
  Check,
  Clock3,
  LockKeyhole,
  ScanLine,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export type MooloMascotState =
  | "idle"
  | "safe"
  | "scanning"
  | "alert"
  | "guard"
  | "waiting"
  | "frozen"
  | "recovered";

interface MooloMascotProps {
  state?: MooloMascotState;
  size?: "small" | "medium" | "large";
  blinking?: boolean;
}

const stateIcons = {
  idle: LockKeyhole,
  safe: Check,
  scanning: ScanLine,
  alert: ShieldAlert,
  guard: LockKeyhole,
  waiting: Clock3,
  frozen: LockKeyhole,
  recovered: Sparkles,
};

export function MooloMascot({
  state = "safe",
  size = "medium",
  blinking = false,
}: MooloMascotProps) {
  const { t, tx } = useTranslation();
  const StateIcon = stateIcons[state];
  return (
    <div
      className={`moolo-mascot mascot-${state} mascot-${size} ${blinking ? "mascot-blinking" : ""}`}
      data-mascot-state={state}
      role="img"
      aria-label={t("Moolo guardian mascot: {state}", {
        state: tx(state),
      })}
    >
      <span className="moolo-horn moolo-horn-left" aria-hidden="true" />
      <span className="moolo-horn moolo-horn-right" aria-hidden="true" />
      <div className="moolo-ear moolo-ear-left" />
      <div className="moolo-ear moolo-ear-right" />
      <div className="moolo-face">
        <span className="moolo-cow-spot" aria-hidden="true" />
        <span className="moolo-eye moolo-eye-left" />
        <span className="moolo-eye moolo-eye-right" />
        <span className="moolo-muzzle">
          <span className="moolo-nostril" />
          <span className="moolo-nostril" />
          <span className="moolo-mouth" />
        </span>
      </div>
      <span className="moolo-scan-line" aria-hidden="true" />
      <span className="moolo-state-mark" aria-hidden="true">
        <StateIcon size={size === "small" ? 11 : 14} strokeWidth={3} />
      </span>
    </div>
  );
}
