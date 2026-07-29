"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  FileWarning,
  LockKeyhole,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import { MooloMascot } from "@/components/moolo/MooloMascot";
import {
  RialoArchitectureOverview,
  RialoWorkflowPanel,
} from "@/components/rialo/RialoArchitecture";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { StatusBadge } from "@/components/security/StatusBadge";
import { ADDRESSES, SECURITY_STEPS, TOKEN_PRICES } from "@/lib/constants";
import { transitionRialoWorkflow } from "@/lib/rialo";
import {
  createDemoTransaction,
  shortAddress,
} from "@/lib/simulation";
import { useWalletStore } from "@/store/wallet-store";
import type { DemoTransaction, RiskAssessment } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";

export type SecurityExperienceState =
  | {
      kind: "analyze";
      transaction: DemoTransaction;
      assessment: RiskAssessment;
    }
  | { kind: "timelock" }
  | { kind: "guardian" }
  | { kind: "contract"; transaction: DemoTransaction }
  | { kind: "agent"; transaction: DemoTransaction }
  | { kind: "frozen"; transaction: DemoTransaction }
  | { kind: "activity"; transaction: DemoTransaction }
  | { kind: "receive" }
  | { kind: "swap" }
  | { kind: "architecture" }
  | { kind: "reset-confirm" };

interface SecurityExperienceProps {
  experience: SecurityExperienceState;
  onClose: () => void;
  onChange: (experience: SecurityExperienceState) => void;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

function RiskMeter({
  score,
  level,
}: {
  score: number;
  level: RiskAssessment["level"];
}) {
  const { t } = useTranslation();
  return (
    <div className="risk-meter">
      <div className="risk-meter-heading">
        <span>{t("Risk score")}</span>
        <strong>{score}/100</strong>
      </div>
      <div
        className="risk-track"
        aria-label={`${t("Risk score")} ${score} / 100`}
      >
        <motion.span
          className={`risk-fill risk-${level.toLowerCase()}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <StatusBadge value={level} />
    </div>
  );
}

export function SecurityExperience({
  experience,
  onClose,
  onChange,
}: SecurityExperienceProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    return () => returnFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.scrollTop = 0;
    }
  }, [experience.kind]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, experience.kind]);

  return (
    <div className="modal-backdrop" role="presentation">
      <motion.section
        className="security-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="security-modal-title"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
      >
        <button
          className="icon-button modal-close"
          type="button"
          onClick={onClose}
          aria-label={t("Close dialog")}
        >
          <X size={19} />
        </button>
        {experience.kind === "analyze" && (
          <AnalysisExperience
            transaction={experience.transaction}
            assessment={experience.assessment}
            onClose={onClose}
            onChange={onChange}
          />
        )}
        {experience.kind === "timelock" && (
          <TimeLockExperience onClose={onClose} onChange={onChange} />
        )}
        {experience.kind === "guardian" && (
          <GuardianExperience onClose={onClose} />
        )}
        {experience.kind === "contract" && (
          <ContractExperience
            transaction={experience.transaction}
            onClose={onClose}
          />
        )}
        {experience.kind === "agent" && (
          <AgentExperience transaction={experience.transaction} onClose={onClose} />
        )}
        {experience.kind === "frozen" && (
          <FrozenExperience
            transaction={experience.transaction}
            onClose={onClose}
            onChange={onChange}
          />
        )}
        {experience.kind === "activity" && (
          <ActivityExperience
            transaction={experience.transaction}
            onClose={onClose}
          />
        )}
        {experience.kind === "receive" && <ReceiveExperience onClose={onClose} />}
        {experience.kind === "swap" && <SwapExperience onClose={onClose} />}
        {experience.kind === "architecture" && (
          <RialoArchitectureOverview onClose={onClose} />
        )}
        {experience.kind === "reset-confirm" && (
          <ResetExperience onClose={onClose} />
        )}
      </motion.section>
    </div>
  );
}

function AnalysisExperience({
  transaction,
  assessment,
  onClose,
  onChange,
}: {
  transaction: DemoTransaction;
  assessment: RiskAssessment;
  onClose: () => void;
  onChange: (experience: SecurityExperienceState) => void;
}) {
  const { t, tx, formatNumber } = useTranslation();
  const [completedSteps, setCompletedSteps] = useState(0);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const processedRef = useRef(false);
  const confirmTransaction = useWalletStore(
    (state) => state.confirmTransaction,
  );
  const addActivity = useWalletStore((state) => state.addActivity);
  const startTimeLock = useWalletStore((state) => state.startTimeLock);
  const setAwaitingGuardian = useWalletStore(
    (state) => state.setAwaitingGuardian,
  );
  const analysisDone = completedSteps === SECURITY_STEPS.length;

  useEffect(() => {
    if (analysisDone) return;
    const timer = window.setTimeout(
      () => setCompletedSteps((current) => current + 1),
      480,
    );
    return () => window.clearTimeout(timer);
  }, [analysisDone, completedSteps]);

  useEffect(() => {
    if (!analysisDone || processedRef.current) return;
    processedRef.current = true;
    if (assessment.decision === "allow") {
      confirmTransaction(transaction);
    }
    if (assessment.decision === "block") {
      addActivity({ ...transaction, status: "Blocked" });
    }
  }, [
    addActivity,
    analysisDone,
    assessment.decision,
    confirmTransaction,
    transaction,
  ]);

  const startDelay = () => {
    if (actionPending) return;
    setActionPending(true);
    if (startTimeLock(transaction)) {
      onChange({ kind: "timelock" });
    } else {
      setActionPending(false);
      setActionError(
        "This protected flow could not start. Finish the current request or reset the demo balance.",
      );
    }
  };

  const requestGuardian = () => {
    if (actionPending) return;
    setActionPending(true);
    if (startTimeLock(transaction)) {
      setAwaitingGuardian();
      onChange({ kind: "guardian" });
    } else {
      setActionPending(false);
      setActionError(
        "Guardian review could not start. Finish the current request or reset the demo balance.",
      );
    }
  };

  if (!analysisDone) {
    return (
      <div className="modal-content analysis-progress" aria-live="polite">
        <div className="modal-mascot">
          <MooloMascot state="scanning" size="large" />
        </div>
        <span className="eyebrow">
          {tx("Reactive protection in progress")}
        </span>
        <h2 id="security-modal-title">{tx("Security Check")}</h2>
        <p>
          {tx(
            "Moolo is reviewing this simulated transaction before it can move.",
          )}
        </p>
        <div className="security-step-list">
          {SECURITY_STEPS.map((step, index) => {
            const done = index < completedSteps;
            const active = index === completedSteps;
            return (
              <div
                className={`security-step ${done ? "step-done" : ""} ${active ? "step-active" : ""}`}
                key={step}
              >
                <span>{done ? <Check size={15} /> : index + 1}</span>
                <strong>{tx(step)}</strong>
                {active && <i>{tx("Checking…")}</i>}
              </div>
            );
          })}
        </div>
        <SimulationNotice compact />
      </div>
    );
  }

  const isSafe = assessment.decision === "allow";
  const isBlocked = assessment.decision === "block";

  return (
    <div className="modal-content result-content" aria-live="polite">
      <div className={`result-hero result-${assessment.level.toLowerCase()}`}>
        <MooloMascot
          state={isSafe ? "safe" : isBlocked ? "guard" : "alert"}
          size="large"
        />
        <span className="eyebrow">{tx("Analysis complete")}</span>
        <h2 id="security-modal-title">
          {isSafe
            ? tx("Transfer confirmed")
            : isBlocked
              ? tx("Transaction blocked")
              : tx("Moolo stepped in")}
        </h2>
        <p>
          {isSafe
            ? tx(
                "No concerning signals were found. Your demo balance has been updated.",
              )
            : isBlocked
              ? tx(
                  "This recipient is known to be malicious. Your demo funds remain untouched.",
                )
              : tx(
                  "This transfer needs a security delay or guardian review before it can continue.",
                )}
        </p>
      </div>
      <RiskMeter score={assessment.score} level={assessment.level} />
      <div className="reason-list">
        {assessment.reasons.map((reason) => (
          <div key={reason}>
            {isBlocked ? (
              <Ban size={15} aria-hidden="true" />
            ) : (
              <ShieldCheck size={15} aria-hidden="true" />
            )}
            <span>{tx(reason)}</span>
          </div>
        ))}
      </div>
      <div className="transaction-summary compact-summary">
        <DetailRow label={t("Amount")}>
          {formatNumber(transaction.amount)} {transaction.token}
        </DetailRow>
        <DetailRow label={t("Recipient")}>
          {shortAddress(transaction.to)}
        </DetailRow>
        {isSafe && (
          <DetailRow label={t("Network fee")}>
            {transaction.fee} ETH
          </DetailRow>
        )}
        {isBlocked && (
          <DetailRow label={tx("Previous reports")}>128</DetailRow>
        )}
      </div>
      <RialoWorkflowPanel workflow={transaction.rialoWorkflow} />
      {assessment.decision === "timelock" ? (
        <div className="modal-action-stack">
          {actionError && (
            <p className="field-error" role="alert">
              {tx(actionError)}
            </p>
          )}
          <button
            className="primary-button full-button"
            onClick={startDelay}
            disabled={actionPending}
          >
            <Clock3 size={17} aria-hidden="true" />
            {tx("Start Security Delay")}
          </button>
          <button
            className="secondary-button full-button"
            onClick={requestGuardian}
            disabled={actionPending}
          >
            <UserRoundCheck size={17} aria-hidden="true" />
            {tx("Request Guardian Approval")}
          </button>
          <button
            className="text-button"
            onClick={() => {
              addActivity({ ...transaction, status: "Cancelled" });
              onClose();
            }}
            disabled={actionPending}
          >
            {t("Cancel Transfer")}
          </button>
        </div>
      ) : assessment.decision === "review" ? (
        <div className="modal-action-stack">
          <button
            className="primary-button full-button"
            onClick={() => {
              if (actionPending) return;
              setActionPending(true);
              confirmTransaction(transaction);
              onClose();
            }}
            disabled={actionPending}
          >
            <BadgeCheck size={17} aria-hidden="true" />
            {tx("Confirm After Review")}
          </button>
          <button className="text-button" onClick={onClose}>
            {t("Cancel Transfer")}
          </button>
        </div>
      ) : (
        <button className="primary-button full-button" onClick={onClose}>
          {isSafe ? tx("Back to Wallet") : tx("Return Safely")}
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      )}
      <SimulationNotice compact />
    </div>
  );
}

function TimeLockExperience({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange: (experience: SecurityExperienceState) => void;
}) {
  const { t, tx, formatNumber, formatTime } = useTranslation();
  const pending = useWalletStore((state) => state.pendingTransfer);
  const activity = useWalletStore((state) => state.activity);
  const cancelPending = useWalletStore((state) => state.cancelPending);
  const setAwaitingGuardian = useWalletStore(
    (state) => state.setAwaitingGuardian,
  );
  const [now, setNow] = useState(0);
  const [trackedPendingId] = useState(pending?.transaction.id ?? null);
  const completedTransaction = trackedPendingId
    ? activity.find(
        (item) =>
          item.id === trackedPendingId && item.status === "Confirmed",
      )
    : undefined;
  const remaining = pending
    ? now === 0
      ? Math.max(
          0,
          Math.ceil((pending.endsAt - pending.startedAt) / 1000),
        )
      : Math.max(0, Math.ceil((pending.endsAt - now) / 1000))
    : 0;

  useEffect(() => {
    const kickoff = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, []);

  if (completedTransaction) {
    return (
      <div className="modal-content centered-result">
        <MooloMascot state="safe" size="large" />
        <span className="eyebrow">{tx("Security delay complete")}</span>
        <h2 id="security-modal-title">{tx("Transfer confirmed")}</h2>
        <p>{tx("The simulated amount has now been deducted from the wallet.")}</p>
        <RialoWorkflowPanel
          workflow={completedTransaction.rialoWorkflow}
          open={false}
        />
        <button className="primary-button full-button" onClick={onClose}>
          {tx("Back to Wallet")}
        </button>
        <SimulationNotice compact />
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="modal-content centered-result">
        <MooloMascot state="waiting" size="large" />
        <h2 id="security-modal-title">{tx("No transfer is waiting")}</h2>
        <p>
          {tx(
            "Launch the Large Transfer scenario to create a security delay.",
          )}
        </p>
        <button className="primary-button full-button" onClick={onClose}>
          {tx("Back to Wallet")}
        </button>
      </div>
    );
  }

  const requestGuardian = () => {
    setAwaitingGuardian();
    onChange({ kind: "guardian" });
  };
  const progress = Math.min(
    100,
    Math.max(
      0,
      ((pending.endsAt - pending.startedAt - remaining * 1_000) /
        (pending.endsAt - pending.startedAt)) *
        100,
    ),
  );

  return (
    <div className="modal-content timelock-content" aria-live="polite">
      <div className="modal-mascot">
        <MooloMascot state="waiting" size="large" />
      </div>
      <span className="eyebrow">{tx("Native timer protection")}</span>
      <h2 id="security-modal-title">{tx("Security delay active")}</h2>
      <p>
        {tx(
          "Moolo is holding this high-risk transfer so there is time to react.",
        )}
      </p>
      <div className="countdown-ring">
        <span>{remaining}</span>
        <small>{tx("seconds")}</small>
        <i style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties} />
      </div>
      <div className="transaction-summary">
        <DetailRow label={t("Amount")}>
          {formatNumber(pending.transaction.amount)}{" "}
          {pending.transaction.token}
        </DetailRow>
        <DetailRow label={t("Recipient")}>
          {shortAddress(pending.transaction.to)}
        </DetailRow>
        <DetailRow label={tx("Started")}>
          {formatTime(pending.startedAt)}
        </DetailRow>
      </div>
      <div className="reason-list">
        {pending.transaction.reasons.map((reason) => (
          <div key={reason}>
            <ShieldAlert size={15} aria-hidden="true" />
            <span>{tx(reason)}</span>
          </div>
        ))}
      </div>
      <RialoWorkflowPanel workflow={pending.transaction.rialoWorkflow} />
      <button className="primary-button full-button" onClick={requestGuardian}>
        <UserRoundCheck size={17} aria-hidden="true" />
        {tx("Request Guardian")}
      </button>
      <button
        className="danger-button full-button"
        onClick={() => {
          cancelPending();
          onClose();
        }}
      >
        {t("Cancel Transfer")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function GuardianExperience({ onClose }: { onClose: () => void }) {
  const { t, tx, formatNumber } = useTranslation();
  const pending = useWalletStore((state) => state.pendingTransfer);
  const activity = useWalletStore((state) => state.activity);
  const approvePending = useWalletStore((state) => state.approvePending);
  const cancelPending = useWalletStore((state) => state.cancelPending);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trackedTransaction] = useState(pending?.transaction);
  const settledTransaction = trackedTransaction
    ? activity.find((item) => item.id === trackedTransaction.id)
    : undefined;

  if (result) {
    return (
      <div className="modal-content centered-result">
        <MooloMascot
          state={result === "approved" ? "safe" : "alert"}
          size="large"
        />
        <span className="eyebrow">{tx("Guardian decision recorded")}</span>
        <h2 id="security-modal-title">
          {result === "approved"
            ? tx("Transfer approved")
            : tx("Transfer rejected")}
        </h2>
        <p>
          {result === "approved"
            ? tx("The simulated balance and activity have been updated.")
            : tx("The transfer was cancelled. No demo funds moved.")}
        </p>
        {trackedTransaction && (
          <RialoWorkflowPanel
            workflow={
              settledTransaction?.rialoWorkflow ??
              transitionRialoWorkflow(
                trackedTransaction.rialoWorkflow,
                result === "approved" ? "Confirmed" : "Cancelled",
              )
            }
          />
        )}
        <button className="primary-button full-button" onClick={onClose}>
          {tx("Back to Wallet")}
        </button>
        <SimulationNotice compact />
      </div>
    );
  }

  if (!pending) {
    return (
      <div className="modal-content centered-result">
        <MooloMascot state="waiting" size="large" />
        <h2 id="security-modal-title">{tx("No guardian request yet")}</h2>
        <p>
          {tx(
            "Start a large transfer first, then ask a guardian to review it.",
          )}
        </p>
        <button className="primary-button full-button" onClick={onClose}>
          {tx("Back to Wallet")}
        </button>
      </div>
    );
  }

  return (
    <div className="modal-content guardian-content">
      <div className="guardian-avatar">
        <UserRoundCheck size={26} aria-hidden="true" />
      </div>
      <span className="eyebrow">{t("Guardian approval")}</span>
      <h2 id="security-modal-title">{tx("A transfer needs your review")}</h2>
      <p>
        {tx(
          "You are acting as the designated guardian in this browser-only demo.",
        )}
      </p>
      <div className="transaction-summary">
        <DetailRow label={tx("Guardian")}>
          {shortAddress(ADDRESSES.guardian)}
        </DetailRow>
        <DetailRow label={t("Amount")}>
          {formatNumber(pending.transaction.amount)}{" "}
          {pending.transaction.token}
        </DetailRow>
        <DetailRow label={tx("To")}>
          {shortAddress(pending.transaction.to)}
        </DetailRow>
        <DetailRow label={t("Risk")}>
          <StatusBadge value={pending.transaction.riskLevel} />
        </DetailRow>
      </div>
      <div className="reason-list">
        {pending.transaction.reasons.map((reason) => (
          <div key={reason}>
            <ShieldAlert size={15} aria-hidden="true" />
            <span>{tx(reason)}</span>
          </div>
        ))}
      </div>
      <RialoWorkflowPanel workflow={pending.transaction.rialoWorkflow} />
      <button
        className="primary-button full-button"
        onClick={() => {
          if (submitting) return;
          setSubmitting(true);
          approvePending();
          setResult("approved");
        }}
        disabled={submitting}
      >
        <BadgeCheck size={17} aria-hidden="true" />
        {tx("Approve as Guardian")}
      </button>
      <button
        className="danger-button full-button"
        onClick={() => {
          if (submitting) return;
          setSubmitting(true);
          cancelPending();
          setResult("rejected");
        }}
        disabled={submitting}
      >
        {tx("Reject Transfer")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function ContractExperience({
  transaction,
  onClose,
}: {
  transaction: DemoTransaction;
  onClose: () => void;
}) {
  const { t, tx } = useTranslation();
  return (
    <div className="modal-content contract-content">
      <div className="warning-icon">
        <FileWarning size={28} aria-hidden="true" />
      </div>
      <span className="eyebrow">{tx("Contract analysis")}</span>
      <h2 id="security-modal-title">{tx("Unknown contract blocked")}</h2>
      <p>
        {tx(
          "This unverified contract asks for an unlimited token permission. Moolo stopped the interaction.",
        )}
      </p>
      <RiskMeter score={transaction.riskScore} level={transaction.riskLevel} />
      <div className="transaction-summary">
        <DetailRow label={tx("Contract")}>
          {shortAddress(ADDRESSES.contract)}
        </DetailRow>
        <DetailRow label={tx("Verification")}>
          <StatusBadge value="Unverified" />
        </DetailRow>
        <DetailRow label={tx("Permission")}>{tx("Unlimited USDC")}</DetailRow>
        <DetailRow label={tx("Decision")}>{tx("Block Interaction")}</DetailRow>
      </div>
      <div className="reason-list">
        <div>
          <Ban size={15} aria-hidden="true" />
          <span>{tx("Suspicious approval pattern")}</span>
        </div>
        <div>
          <Ban size={15} aria-hidden="true" />
          <span>{tx("Unlimited token permission")}</span>
        </div>
      </div>
      <RialoWorkflowPanel workflow={transaction.rialoWorkflow} />
      <button className="primary-button full-button" onClick={onClose}>
        {t("Return to Wallet")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function AgentExperience({
  transaction,
  onClose,
}: {
  transaction: DemoTransaction;
  onClose: () => void;
}) {
  const { t, tx, formatNumber } = useTranslation();
  const dailyLimit = useWalletStore(
    (state) => state.settings.aiAgentDailyLimit,
  );
  return (
    <div className="modal-content agent-content">
      <div className="agent-mark">
        <Bot size={26} aria-hidden="true" />
      </div>
      <span className="eyebrow">{tx("AI agent permission")}</span>
      <h2 id="security-modal-title">{tx("Permission denied")}</h2>
      <p>
        {tx(
          "Moolo Assistant Agent requested more than its daily spending allowance.",
        )}
      </p>
      <RiskMeter score={transaction.riskScore} level={transaction.riskLevel} />
      <div className="limit-comparison">
        <div>
          <span>{tx("Requested")}</span>
          <strong>50 USDC</strong>
        </div>
        <ChevronRight size={18} aria-hidden="true" />
        <div>
          <span>{tx("Daily limit")}</span>
          <strong>{formatNumber(dailyLimit)} USDC</strong>
        </div>
      </div>
      <div className="decision-banner decision-denied">
        <Ban size={17} aria-hidden="true" />
        {tx("Demo funds untouched")}
      </div>
      <RialoWorkflowPanel workflow={transaction.rialoWorkflow} />
      <button className="primary-button full-button" onClick={onClose}>
        {t("Return to Wallet")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function FrozenExperience({
  transaction,
  onClose,
  onChange,
}: {
  transaction: DemoTransaction;
  onClose: () => void;
  onChange: (experience: SecurityExperienceState) => void;
}) {
  const { t, tx } = useTranslation();
  const protectionState = useWalletStore((state) => state.protectionState);
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const recovery = useWalletStore((state) => state.recovery);
  const beginRecovery = useWalletStore((state) => state.beginRecovery);
  const completeRecovery = useWalletStore((state) => state.completeRecovery);
  const [recovering, setRecovering] = useState(
    protectionState === "Recovering",
  );
  const [now, setNow] = useState(0);
  const [finished, setFinished] = useState(false);
  const [recoveryWorkflow, setRecoveryWorkflow] = useState(
    recovery?.transaction.rialoWorkflow ?? null,
  );
  const completionRef = useRef(false);
  const recoverySteps = [
    "Recovery requested",
    "Guardian verified",
    "Security delay completed",
    "New demo wallet assigned",
    "Recovery completed",
  ];

  const step =
    recovering && recovery
      ? Math.min(
          recoverySteps.length,
          Math.floor(((now || recovery.startedAt) - recovery.startedAt) / 520),
        )
      : 0;

  useEffect(() => {
    if (!recovering || !recovery || step >= recoverySteps.length) return;
    const timer = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, [recovering, recovery, recoverySteps.length, step]);

  useEffect(() => {
    if (
      !recovering ||
      !recovery ||
      step !== recoverySteps.length ||
      completionRef.current
    ) {
      return;
    }
    completionRef.current = true;
    setFinished(true);
    completeRecovery();
  }, [completeRecovery, recovering, recovery, recoverySteps.length, step]);

  if (recovering) {
    const recoveryFinished = finished || step === recoverySteps.length;
    return (
      <div className="modal-content recovery-content" aria-live="polite">
        <div className="modal-mascot">
          <MooloMascot
            state={recoveryFinished ? "recovered" : "waiting"}
            size="large"
          />
        </div>
        <span className="eyebrow">{tx("Guided recovery")}</span>
        <h2 id="security-modal-title">
          {recoveryFinished
            ? tx("Recovery complete")
            : tx("Securing your wallet")}
        </h2>
        <p>
          {recoveryFinished
            ? tx(
                "A fresh demo wallet is protected. Simulated balances are preserved so the presentation can continue.",
              )
            : tx("Moolo is coordinating a simulated guardian recovery.")}
        </p>
        <div className="security-step-list">
          {recoverySteps.map((label, index) => (
            <div
              className={`security-step ${index < step ? "step-done" : ""} ${index === step ? "step-active" : ""}`}
              key={label}
            >
              <span>{index < step ? <Check size={15} /> : index + 1}</span>
              <strong>{tx(label)}</strong>
            </div>
          ))}
        </div>
        {(recovery?.transaction.rialoWorkflow ?? recoveryWorkflow) && (
          <RialoWorkflowPanel
            workflow={
              recovery?.transaction.rialoWorkflow ?? recoveryWorkflow!
            }
          />
        )}
        {recoveryFinished && (
          <>
            <div className="new-wallet-box">
              <span>{tx("New demo wallet")}</span>
              <strong>{shortAddress(ADDRESSES.recovered)}</strong>
              <StatusBadge value="Protected" />
            </div>
            <button className="primary-button full-button" onClick={onClose}>
              {tx("Open Recovered Wallet")}
            </button>
          </>
        )}
        <SimulationNotice compact />
      </div>
    );
  }

  return (
    <div className="modal-content frozen-content">
      <div className="frozen-mark">
        <LockKeyhole size={28} aria-hidden="true" />
      </div>
      <span className="eyebrow">{tx("Emergency protection")}</span>
      <h2 id="security-modal-title">{t("Wallet frozen")}</h2>
      <p>
        {tx(
          "Abnormal behavior was detected. Send is disabled and the guardian has been notified in this simulation.",
        )}
      </p>
      <div className="freeze-status-list">
        <div>
          <Ban size={16} aria-hidden="true" />
          {tx("All outgoing transfers paused")}
        </div>
        <div>
          <UserRoundCheck size={16} aria-hidden="true" />
          {tx("Guardian notified")}
        </div>
        <div>
          <Shield size={16} aria-hidden="true" />
          {tx("Demo balance secured")}
        </div>
      </div>
      <RialoWorkflowPanel workflow={transaction.rialoWorkflow} />
      <button
        className="primary-button full-button"
        onClick={() => {
          const recoveryTransaction = createDemoTransaction({
            type: "Wallet recovery",
            token: "ETH",
            amount: 0,
            from: walletAddress,
            to: ADDRESSES.recovered,
            assessment: {
              score: 10,
              level: "Low",
              reasons: ["Guardian verification and recovery delay completed"],
              decision: "allow",
            },
            status: "Recovered",
            rialoKind: "recovery",
            policies: ["Emergency freeze", "Guardian recovery"],
          });
          setRecoveryWorkflow(recoveryTransaction.rialoWorkflow);
          beginRecovery(recoveryTransaction);
          setRecovering(true);
          setNow(Date.now());
        }}
      >
        <RotateCcw size={17} aria-hidden="true" />
        {tx("Start Recovery")}
      </button>
      <button
        className="secondary-button full-button"
        onClick={() => onChange({ kind: "reset-confirm" })}
      >
        {t("Reset Demo")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function ActivityExperience({
  transaction,
  onClose,
}: {
  transaction: DemoTransaction;
  onClose: () => void;
}) {
  const {
    t,
    tx,
    formatCurrency,
    formatDateTime,
    formatNumber,
  } = useTranslation();
  const usdValue = transaction.amount * TOKEN_PRICES[transaction.token];
  const [copied, setCopied] = useState(false);
  return (
    <div className="modal-content activity-detail-content">
      <div className="modal-mascot">
        <MooloMascot
          state={
            transaction.status === "Confirmed"
              ? "safe"
              : transaction.status === "Recovered"
                ? "recovered"
              : transaction.status === "Frozen"
                ? "frozen"
                : "alert"
          }
          size="large"
        />
      </div>
      <span className="eyebrow">{tx("Activity details")}</span>
      <h2 id="security-modal-title">{tx(transaction.type)}</h2>
      <StatusBadge value={transaction.status} />
      <div className="transaction-summary">
        <DetailRow label={tx("Type")}>{tx(transaction.type)}</DetailRow>
        <DetailRow label={tx("Status")}>
          <StatusBadge value={transaction.status} />
        </DetailRow>
        <DetailRow label={t("Amount")}>
          {formatNumber(transaction.amount)} {transaction.token}
        </DetailRow>
        <DetailRow label={tx("USD value")}>
          {formatCurrency(usdValue)}
        </DetailRow>
        <DetailRow label={tx("From")}>
          {shortAddress(transaction.from)}
        </DetailRow>
        <DetailRow label={tx("To")}>{shortAddress(transaction.to)}</DetailRow>
        <DetailRow label={t("Risk score")}>
          {transaction.riskScore}/100
        </DetailRow>
        <DetailRow label={tx("Created")}>
          {formatDateTime(transaction.createdAt)}
        </DetailRow>
        <DetailRow label={tx("Demo block")}>
          #{formatNumber(transaction.blockNumber)}
        </DetailRow>
        <DetailRow label={t("Network fee")}>
          {transaction.fee} ETH
        </DetailRow>
      </div>
      <section className="activity-policy-detail">
        <strong>{tx("Risk reasons")}</strong>
        <ul>
          {transaction.reasons.map((reason) => (
            <li key={reason}>{tx(reason)}</li>
          ))}
        </ul>
        <strong>{tx("Applied policies")}</strong>
        <ul>
          {transaction.policies.map((policy) => (
            <li key={policy}>{tx(policy)}</li>
          ))}
        </ul>
      </section>
      <RialoWorkflowPanel workflow={transaction.rialoWorkflow} />
      <div className="hash-box">
        <span>{tx("Simulated transaction hash")}</span>
        <code>{transaction.hash}</code>
        <button
          type="button"
          aria-label={tx("Copy simulated transaction hash")}
          onClick={() => {
            void navigator.clipboard.writeText(transaction.hash);
            setCopied(true);
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <div className="sr-only" aria-live="polite">
        {copied ? tx("Simulated transaction hash copied.") : ""}
      </div>
      <button className="primary-button full-button" onClick={onClose}>
        {tx("Close Details")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function ResetExperience({ onClose }: { onClose: () => void }) {
  const { t, tx } = useTranslation();
  const resetDemo = useWalletStore((state) => state.resetDemo);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="modal-content centered-result">
      <div className="warning-icon">
        <RotateCcw size={27} aria-hidden="true" />
      </div>
      <span className="eyebrow">{tx("Reset local simulation")}</span>
      <h2 id="security-modal-title">{tx("Reset the entire demo?")}</h2>
      <p>
        {tx(
          "Balances, settings, pending timers, recovery state, activity, and the saved browser state will return to their presentation defaults.",
        )}
      </p>
      <button
        className="danger-button full-button"
        type="button"
        disabled={resetting}
        onClick={() => {
          if (resetting) return;
          setResetting(true);
          resetDemo();
          onClose();
        }}
      >
        {t("Reset Demo")}
      </button>
      <button
        className="secondary-button full-button"
        type="button"
        disabled={resetting}
        onClick={onClose}
      >
        {tx("Keep Current State")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function ReceiveExperience({ onClose }: { onClose: () => void }) {
  const { tx } = useTranslation();
  const address = useWalletStore((state) => state.walletAddress);
  const [copied, setCopied] = useState(false);
  return (
    <div className="modal-content centered-result">
      <div className="receive-qr" aria-label={tx("Decorative demo QR code")}>
        {Array.from({ length: 25 }, (_, index) => (
          <i key={index} className={index % 3 === 0 || index % 7 === 0 ? "on" : ""} />
        ))}
      </div>
      <span className="eyebrow">{tx("Receive demo assets")}</span>
      <h2 id="security-modal-title">{tx("Your demo address")}</h2>
      <p>
        {tx("This modal is visual only. It cannot receive real tokens.")}
      </p>
      <div className="hash-box receive-address">
        <code>{address}</code>
      </div>
      <button
        className="primary-button full-button"
        onClick={() => {
          void navigator.clipboard.writeText(address);
          setCopied(true);
        }}
      >
        <Copy size={16} aria-hidden="true" />
        {copied ? tx("Address copied") : tx("Copy demo address")}
      </button>
      <button className="text-button" onClick={onClose}>
        {tx("Close")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}

function SwapExperience({ onClose }: { onClose: () => void }) {
  const { tx } = useTranslation();
  return (
    <div className="modal-content centered-result">
      <div className="swap-orb">
        <ArrowLeft size={20} />
        <ChevronRight size={20} />
      </div>
      <span className="eyebrow">{tx("Preview only")}</span>
      <h2 id="security-modal-title">{tx("Swap is resting today")}</h2>
      <p>
        {tx(
          "This demo keeps the focus on reactive wallet security. No pricing, liquidity, or real swap request is used.",
        )}
      </p>
      <button className="primary-button full-button" onClick={onClose}>
        {tx("Back to Wallet")}
      </button>
      <SimulationNotice compact />
    </div>
  );
}
