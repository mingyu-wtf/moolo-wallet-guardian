import {
  Braces,
  Clock3,
  EyeOff,
  RadioTower,
} from "lucide-react";
import { RialoMark } from "@/components/rialo/RialoMark";
import { RIALO_PRIMITIVE_META } from "@/lib/rialo";
import type {
  RialoPrimitive,
  RialoTraceStatus,
  RialoWorkflowSummary,
} from "@/types";

const primitiveIcons = {
  "reactive-transaction": Braces,
  "native-timer": Clock3,
  "validator-attested-web-call": RadioTower,
  "private-policy": EyeOff,
} satisfies Record<RialoPrimitive, typeof Braces>;

const statusLabels: Record<RialoTraceStatus, string> = {
  waiting: "Waiting",
  evaluating: "Evaluating",
  triggered: "Triggered",
  completed: "Completed",
  blocked: "Blocked",
  skipped: "Not used",
};

const decisionLabels: Record<RialoWorkflowSummary["finalDecision"], string> = {
  allow: "Allow",
  delay: "Delay",
  "require-guardian": "Require guardian",
  deny: "Deny",
  freeze: "Freeze",
  recover: "Recover",
};

export function RialoPrimitiveGrid({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rialo-primitive-grid ${compact ? "is-compact" : ""}`}>
      {(
        Object.entries(RIALO_PRIMITIVE_META) as Array<
          [
            RialoPrimitive,
            (typeof RIALO_PRIMITIVE_META)[RialoPrimitive],
          ]
        >
      ).map(([primitive, meta]) => {
        const Icon = primitiveIcons[primitive];
        return (
          <article className="rialo-primitive-card" key={primitive}>
            <span className="rialo-primitive-icon">
              <Icon size={17} aria-hidden="true" />
            </span>
            <div>
              <strong>{meta.title}</strong>
              <p>{meta.description}</p>
              <small>{meta.simulationLabel}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function RialoWorkflowPanel({
  workflow,
  open = true,
}: {
  workflow: RialoWorkflowSummary;
  open?: boolean;
}) {
  return (
    <details className="rialo-workflow-panel" open={open}>
      <summary>
        <span>
          <RialoMark size="small" />
          Simulated Rialo Workflow
        </span>
        <strong>{decisionLabels[workflow.finalDecision]}</strong>
      </summary>
      <div className="rialo-workflow-body">
        <div className="rialo-workflow-heading">
          <span>Workflow</span>
          <strong>{workflow.workflowName}</strong>
          <p>{workflow.predicateSummary}</p>
        </div>
        <ol className="rialo-trace-list">
          {workflow.traces.map((trace) => {
            const meta = RIALO_PRIMITIVE_META[trace.primitive];
            return (
              <li
                className={`rialo-trace trace-${trace.status}`}
                key={trace.id}
              >
                <span className="rialo-trace-node" aria-hidden="true" />
                <div>
                  <span className="rialo-trace-title">
                    <strong>{trace.title}</strong>
                    <i>{statusLabels[trace.status]}</i>
                  </span>
                  <p>{trace.resultSummary ?? trace.description}</p>
                  <small>{meta.simulationLabel}</small>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </details>
  );
}

export function RialoArchitectureOverview({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div className="modal-content rialo-architecture-content">
      <div className="rialo-architecture-brand">
        <RialoMark size="large" />
        <div>
          <span className="eyebrow">Designed for Rialo</span>
          <h2 id="security-modal-title">Rialo Architecture Simulation</h2>
          <p>
            Moolo maps wallet protection into reactive decisions, native time
            conditions, external signals, and private policy results.
          </p>
        </div>
      </div>
      <RialoPrimitiveGrid />
      <div className="rialo-disclaimer">
        <strong>Rialo Concept Demo</strong>
        <p>
          This is a local front-end architecture simulation. It does not connect
          to a Rialo SDK or RPC, call validators, submit transactions, or perform
          confidential execution.
        </p>
      </div>
      <button className="primary-button full-button" type="button" onClick={onClose}>
        Back to Moolo
      </button>
    </div>
  );
}
