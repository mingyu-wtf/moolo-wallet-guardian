import { MooloMascot } from "@/components/moolo/MooloMascot";

interface BrandProps {
  compact?: boolean;
}

export function Brand({ compact = false }: BrandProps) {
  return (
    <div className="brand-lockup" aria-label="Moolo">
      <MooloMascot state="safe" size={compact ? "small" : "medium"} />
      <div>
        <strong>Moolo</strong>
        {!compact && <span>Reactive wallet guardian</span>}
      </div>
    </div>
  );
}
