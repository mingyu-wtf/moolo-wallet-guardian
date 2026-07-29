import {
  BadgeCheck,
  Ban,
  Clock3,
  LockKeyhole,
  ShieldAlert,
} from "lucide-react";
import type { RiskLevel, TransactionStatus } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

interface StatusBadgeProps {
  value:
    | RiskLevel
    | TransactionStatus
    | "Protected"
    | "Recovering"
    | "Unverified";
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const { tx } = useTranslation();
  const normalized = value.toLowerCase().replaceAll(" ", "-");
  const Icon =
    value === "Low" || value === "Confirmed" || value === "Protected"
      ? BadgeCheck
      : value === "Blocked" ||
          value === "Critical" ||
          value === "Frozen" ||
          value === "Unverified"
        ? Ban
        : value === "Timelocked" || value === "Awaiting Guardian"
          ? Clock3
          : value === "High"
            ? LockKeyhole
            : ShieldAlert;

  return (
    <span className={`status-badge status-${normalized}`}>
      <Icon size={13} aria-hidden="true" />
      {tx(value)}
    </span>
  );
}
