"use client";

import { FlaskConical } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SimulationNoticeProps {
  compact?: boolean;
}

export function SimulationNotice({ compact = false }: SimulationNoticeProps) {
  const { t } = useTranslation();
  return (
    <div className={`simulation-notice ${compact ? "notice-compact" : ""}`}>
      <FlaskConical size={15} aria-hidden="true" />
      <span>
        {t("Simulation Mode")} <b>•</b> {t("No Real Assets")} <b>•</b>{" "}
        {t("No Onchain Transactions")}
      </span>
    </div>
  );
}
