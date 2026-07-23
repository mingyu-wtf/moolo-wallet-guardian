import { MooloMascot } from "@/components/moolo/MooloMascot";

interface BrandProps {
  compact?: boolean;
  showMascot?: boolean;
}

export function Brand({ compact = false, showMascot = true }: BrandProps) {
  return (
    <div className="brand-lockup" aria-label="Moolo">
      {showMascot && (
        <MooloMascot state="safe" size={compact ? "small" : "medium"} />
      )}
      <div>
        <strong>Moolo</strong>
        {!compact && <span>Reactive wallet guardian</span>}
      </div>
    </div>
  );
}
