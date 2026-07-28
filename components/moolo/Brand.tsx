"use client";

import { MooloMascot } from "@/components/moolo/MooloMascot";
import { useTranslation } from "@/hooks/useTranslation";

interface BrandProps {
  compact?: boolean;
  showMascot?: boolean;
}

export function Brand({ compact = false, showMascot = true }: BrandProps) {
  const { t } = useTranslation();
  return (
    <div className="brand-lockup" aria-label="Moolo">
      {showMascot && (
        <MooloMascot state="safe" size={compact ? "small" : "medium"} />
      )}
      <div>
        <strong>Moolo</strong>
        {!compact && <span>{t("Reactive wallet guardian")}</span>}
      </div>
    </div>
  );
}
