import { FlaskConical } from "lucide-react";

interface SimulationNoticeProps {
  compact?: boolean;
}

export function SimulationNotice({ compact = false }: SimulationNoticeProps) {
  return (
    <div className={`simulation-notice ${compact ? "notice-compact" : ""}`}>
      <FlaskConical size={15} aria-hidden="true" />
      <span>
        Simulation Mode <b>•</b> No Real Assets <b>•</b> No Onchain Transactions
      </span>
    </div>
  );
}
