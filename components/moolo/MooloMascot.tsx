"use client";

import { Check, Clock3, LockKeyhole, ShieldAlert } from "lucide-react";

interface MooloMascotProps {
  state?: "safe" | "alert" | "guard" | "waiting" | "frozen";
  size?: "small" | "medium" | "large";
}

const stateIcons = {
  safe: Check,
  alert: ShieldAlert,
  guard: LockKeyhole,
  waiting: Clock3,
  frozen: LockKeyhole,
};

export function MooloMascot({
  state = "safe",
  size = "medium",
}: MooloMascotProps) {
  const StateIcon = stateIcons[state];
  return (
    <div
      className={`moolo-mascot mascot-${state} mascot-${size}`}
      role="img"
      aria-label={`Moolo guardian mascot: ${state}`}
    >
      <div className="moolo-ear moolo-ear-left" />
      <div className="moolo-ear moolo-ear-right" />
      <div className="moolo-face">
        <span className="moolo-eye" />
        <span className="moolo-eye" />
        <span className="moolo-mouth" />
      </div>
      <span className="moolo-state-mark" aria-hidden="true">
        <StateIcon size={size === "small" ? 11 : 14} strokeWidth={3} />
      </span>
    </div>
  );
}
