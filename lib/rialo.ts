import type {
  DemoScenario,
  DemoTransaction,
  RialoExecutionTrace,
  RialoPrimitive,
  RialoTraceStatus,
  RialoWorkflowSummary,
  RiskAssessment,
  TokenSymbol,
  TransactionStatus,
} from "@/types";
import { generateSimulationId } from "@/lib/random";

export const RIALO_PRIMITIVE_META: Record<
  RialoPrimitive,
  {
    title: string;
    description: string;
    simulationLabel: string;
  }
> = {
  "reactive-transaction": {
    title: "Reactive Transaction",
    description:
      "A predefined predicate triggered this protection automatically.",
    simulationLabel: "Rialo Architecture Simulation",
  },
  "native-timer": {
    title: "Native Timer",
    description:
      "This workflow is paused until its time condition becomes valid.",
    simulationLabel: "Simulated",
  },
  "validator-attested-web-call": {
    title: "Validator-attested Web Call",
    description:
      "An external risk signal was used as an input to the protection workflow.",
    simulationLabel: "Simulated external signal",
  },
  "private-policy": {
    title: "Private Policy Evaluation",
    description:
      "Sensitive policy inputs remain hidden while the protection result is revealed.",
    simulationLabel: "REX concept simulation",
  },
};

export type RialoWorkflowKind =
  | DemoScenario
  | "manual"
  | "recovery"
  | "received";

interface CreateWorkflowInput {
  kind: RialoWorkflowKind;
  assessment: RiskAssessment;
  amount: number;
  token: TokenSymbol;
}

const statusesByKind: Record<
  RialoWorkflowKind,
  Record<RialoPrimitive, RialoTraceStatus>
> = {
  normal: {
    "reactive-transaction": "completed",
    "native-timer": "skipped",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  large: {
    "reactive-transaction": "triggered",
    "native-timer": "waiting",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  phishing: {
    "reactive-transaction": "blocked",
    "native-timer": "skipped",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  contract: {
    "reactive-transaction": "blocked",
    "native-timer": "skipped",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  agent: {
    "reactive-transaction": "blocked",
    "native-timer": "skipped",
    "validator-attested-web-call": "skipped",
    "private-policy": "completed",
  },
  compromise: {
    "reactive-transaction": "completed",
    "native-timer": "skipped",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  guardian: {
    "reactive-transaction": "triggered",
    "native-timer": "waiting",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  manual: {
    "reactive-transaction": "completed",
    "native-timer": "skipped",
    "validator-attested-web-call": "completed",
    "private-policy": "completed",
  },
  recovery: {
    "reactive-transaction": "completed",
    "native-timer": "completed",
    "validator-attested-web-call": "skipped",
    "private-policy": "completed",
  },
  received: {
    "reactive-transaction": "completed",
    "native-timer": "skipped",
    "validator-attested-web-call": "skipped",
    "private-policy": "skipped",
  },
};

const workflowNames: Record<RialoWorkflowKind, string> = {
  normal: "Trusted Transfer Protection",
  large: "Large Transfer Security Delay",
  phishing: "Malicious Recipient Auto-block",
  contract: "Unknown Contract Protection",
  agent: "AI Agent Spending Guard",
  compromise: "Emergency Wallet Freeze",
  guardian: "Guardian-gated Transfer",
  manual: "Wallet Transfer Protection",
  recovery: "Guardian Recovery Workflow",
  received: "Inbound Activity Observation",
};

const predicates: Record<RialoWorkflowKind, string> = {
  normal: "Trusted recipient and policy checks returned safe.",
  large: "Large value or new-recipient predicate returned true.",
  phishing: "Simulated address reputation signal matched a phishing rule.",
  contract: "Unverified unlimited-approval predicate returned true.",
  agent: "Requested agent spend exceeded its private daily policy.",
  compromise: "Simulated abnormal wallet signal matched the freeze rule.",
  guardian: "Guardian threshold predicate required a second decision.",
  manual: "Configured wallet protection predicates were evaluated.",
  recovery: "Guardian verification and recovery timer conditions completed.",
  received: "Inbound activity was observed without an outgoing policy action.",
};

const decisions: Record<
  RialoWorkflowKind,
  RialoWorkflowSummary["finalDecision"]
> = {
  normal: "allow",
  large: "delay",
  phishing: "deny",
  contract: "deny",
  agent: "deny",
  compromise: "freeze",
  guardian: "require-guardian",
  manual: "allow",
  recovery: "recover",
  received: "allow",
};

function createTrace(
  primitive: RialoPrimitive,
  status: RialoTraceStatus,
  input: CreateWorkflowInput,
): RialoExecutionTrace {
  const meta = RIALO_PRIMITIVE_META[primitive];
  const amountSummary =
    input.amount > 0
      ? `${input.amount.toLocaleString()} ${input.token} request`
      : "Security event";
  const resultSummary =
    status === "waiting"
      ? "Time or guardian condition is not valid yet."
      : status === "blocked"
        ? "Protection action denied the request."
        : status === "skipped"
          ? "This primitive was not needed for this path."
          : status === "triggered"
            ? "Predicate matched and protection is active."
            : "Simulation step completed.";

  return {
    id: generateSimulationId(),
    primitive,
    title: meta.title,
    description: meta.description,
    status,
    simulated: true,
    trigger:
      primitive === "reactive-transaction"
        ? predicates[input.kind]
        : undefined,
    inputSummary:
      primitive === "private-policy"
        ? "Sensitive policy values evaluated without exposing them in this trace."
        : primitive === "validator-attested-web-call"
          ? "Locally simulated address, contract, or behavior signal."
          : amountSummary,
    resultSummary,
    createdAt: new Date().toISOString(),
  };
}

export function createRialoWorkflow(
  input: CreateWorkflowInput,
): RialoWorkflowSummary {
  const kind = input.kind;
  const primitiveStatuses = { ...statusesByKind[kind] };

  if (kind === "manual") {
    if (input.assessment.decision === "block") {
      primitiveStatuses["reactive-transaction"] = "blocked";
      primitiveStatuses["native-timer"] = "skipped";
    } else if (input.assessment.decision === "timelock") {
      primitiveStatuses["reactive-transaction"] = "triggered";
      primitiveStatuses["native-timer"] = "waiting";
    } else if (input.assessment.decision === "review") {
      primitiveStatuses["reactive-transaction"] = "triggered";
    }
  }

  const finalDecision =
    kind === "manual"
      ? input.assessment.decision === "block"
        ? "deny"
        : input.assessment.decision === "timelock"
          ? "delay"
          : "allow"
      : decisions[kind];

  return {
    workflowName: workflowNames[kind],
    predicateSummary: predicates[kind],
    finalDecision,
    traces: (
      Object.keys(RIALO_PRIMITIVE_META) as RialoPrimitive[]
    ).map((primitive) =>
      createTrace(primitive, primitiveStatuses[primitive], input),
    ),
  };
}

export function transitionRialoWorkflow(
  workflow: RialoWorkflowSummary,
  status: TransactionStatus,
): RialoWorkflowSummary {
  const traces = workflow.traces.map((trace) => {
    let nextStatus = trace.status;
    let resultSummary = trace.resultSummary;

    if (status === "Timelocked" && trace.primitive === "native-timer") {
      nextStatus = "waiting";
      resultSummary = "Simulated time condition is not valid yet.";
    } else if (
      status === "Awaiting Guardian" &&
      trace.primitive === "native-timer"
    ) {
      nextStatus = "waiting";
      resultSummary = "Simulated guardian response condition is pending.";
    } else if (status === "Confirmed") {
      if (
        trace.status === "waiting" ||
        trace.status === "evaluating" ||
        trace.status === "triggered"
      ) {
        nextStatus = "completed";
        resultSummary = "Protection condition completed before settlement.";
      }
    } else if (status === "Cancelled") {
      if (trace.status !== "completed" && trace.status !== "blocked") {
        nextStatus = "skipped";
        resultSummary = "Workflow cancelled before settlement.";
      }
    } else if (status === "Blocked" || status === "Agent Denied") {
      if (trace.primitive === "reactive-transaction") {
        nextStatus = "blocked";
        resultSummary = "Reactive protection denied the request.";
      } else if (trace.status === "waiting") {
        nextStatus = "skipped";
      }
    } else if (status === "Frozen" || status === "Recovered") {
      if (trace.status !== "skipped") {
        nextStatus = "completed";
        resultSummary =
          status === "Frozen"
            ? "Emergency freeze action completed."
            : "Recovery condition completed.";
      }
    }

    return { ...trace, status: nextStatus, resultSummary };
  });

  return {
    ...workflow,
    finalDecision:
      status === "Confirmed"
        ? "allow"
        : status === "Timelocked"
          ? "delay"
          : status === "Awaiting Guardian"
        ? "require-guardian"
        : status === "Blocked" ||
            status === "Agent Denied" ||
            status === "Cancelled"
          ? "deny"
        : status === "Frozen"
          ? "freeze"
          : status === "Recovered"
            ? "recover"
            : workflow.finalDecision,
    traces,
  };
}

export function transitionRialoTransaction(
  transaction: DemoTransaction,
  status: TransactionStatus,
): DemoTransaction {
  return {
    ...transaction,
    status,
    rialoWorkflow: transitionRialoWorkflow(
      transaction.rialoWorkflow,
      status,
    ),
  };
}

export function createLegacyRialoWorkflow(input: {
  type: string;
  amount: number;
  token: TokenSymbol;
  status: TransactionStatus;
  riskScore: number;
  riskLevel: RiskAssessment["level"];
  reasons: string[];
}): RialoWorkflowSummary {
  const kind: RialoWorkflowKind =
    input.type === "Received"
      ? "received"
      : input.type === "Wallet recovery"
        ? "recovery"
        : input.type === "Wallet compromise"
          ? "compromise"
          : input.type === "Agent request"
            ? "agent"
            : input.type === "Contract interaction"
              ? "contract"
              : input.status === "Blocked"
                ? "phishing"
                : input.status === "Timelocked"
                  ? "large"
                  : "manual";
  const workflow = createRialoWorkflow({
    kind,
    amount: input.amount,
    token: input.token,
    assessment: {
      score: input.riskScore,
      level: input.riskLevel,
      reasons: input.reasons,
      decision:
        input.status === "Blocked" || input.status === "Agent Denied"
          ? "block"
          : input.status === "Timelocked" ||
              input.status === "Awaiting Guardian"
            ? "timelock"
            : "allow",
    },
  });
  return transitionRialoWorkflow(workflow, input.status);
}
