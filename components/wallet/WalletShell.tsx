"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  FileClock,
  LockKeyhole,
  Menu,
  RefreshCw,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { Brand } from "@/components/moolo/Brand";
import { MooloMascot } from "@/components/moolo/MooloMascot";
import {
  SecurityExperience,
  type SecurityExperienceState,
} from "@/components/security/SecurityExperience";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { StatusBadge } from "@/components/security/StatusBadge";
import {
  ADDRESSES,
  TOKENS,
  TOKEN_PRICES,
} from "@/lib/constants";
import { calculateRisk } from "@/lib/risk-engine";
import {
  createDemoTransaction,
  formatCurrency,
  isEvmAddress,
  shortAddress,
} from "@/lib/simulation";
import { useWalletStore, type WalletView } from "@/store/wallet-store";
import type {
  DemoScenario,
  DemoTransaction,
  TokenSymbol,
} from "@/types";

const tabItems: Array<{
  id: Exclude<WalletView, "send">;
  label: string;
  icon: typeof WalletCards;
}> = [
  { id: "tokens", label: "Tokens", icon: WalletCards },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "shield", label: "Shield", icon: ShieldCheck },
];

interface ActionButtonProps {
  icon: typeof Send;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ActionButton({
  icon: Icon,
  label,
  primary,
  disabled,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      className={`wallet-action ${primary ? "wallet-action-primary" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <span>
        <Icon size={19} aria-hidden="true" />
      </span>
      {label}
    </button>
  );
}

export function WalletShell() {
  const view = useWalletStore((state) => state.view);
  const setView = useWalletStore((state) => state.setView);
  const balances = useWalletStore((state) => state.balances);
  const settings = useWalletStore((state) => state.settings);
  const protectionState = useWalletStore((state) => state.protectionState);
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const pendingTransfer = useWalletStore((state) => state.pendingTransfer);
  const addActivity = useWalletStore((state) => state.addActivity);
  const startTimeLock = useWalletStore((state) => state.startTimeLock);
  const setAwaitingGuardian = useWalletStore(
    (state) => state.setAwaitingGuardian,
  );
  const freezeWallet = useWalletStore((state) => state.freezeWallet);
  const resetDemo = useWalletStore((state) => state.resetDemo);
  const [experience, setExperience] =
    useState<SecurityExperienceState | null>(null);
  const [mobileDemoOpen, setMobileDemoOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalBalance = useMemo(
    () =>
      TOKENS.reduce(
        (total, token) =>
          total + balances[token.symbol] * TOKEN_PRICES[token.symbol],
        0,
      ),
    [balances],
  );

  const createScenarioTransaction = (
    scenario: DemoScenario,
  ): DemoTransaction => {
    const scenarioInput = {
      normal: {
        amount: 100,
        token: "USDC" as const,
        to: ADDRESSES.trusted,
        addressType: "trusted" as const,
      },
      large: {
        amount: 5000,
        token: "USDC" as const,
        to: ADDRESSES.new,
        addressType: "new" as const,
      },
      phishing: {
        amount: 250,
        token: "USDC" as const,
        to: ADDRESSES.phishing,
        addressType: "phishing" as const,
      },
      contract: {
        amount: 0,
        token: "USDC" as const,
        to: ADDRESSES.contract,
        addressType: "contract" as const,
      },
      agent: {
        amount: 50,
        token: "USDC" as const,
        to: ADDRESSES.trusted,
        addressType: "trusted" as const,
      },
      compromise: {
        amount: 0,
        token: "ETH" as const,
        to: walletAddress,
        addressType: "trusted" as const,
      },
      guardian: {
        amount: 5000,
        token: "USDC" as const,
        to: ADDRESSES.new,
        addressType: "new" as const,
      },
    }[scenario];

    const assessment = calculateRisk({
      ...scenarioInput,
      settings,
      isAgent: scenario === "agent",
      compromised: scenario === "compromise",
    });

    const status =
      scenario === "agent"
        ? "Agent Denied"
        : scenario === "compromise"
          ? "Frozen"
          : scenario === "contract" || scenario === "phishing"
            ? "Blocked"
            : scenario === "large" || scenario === "guardian"
              ? "Timelocked"
              : "Confirmed";

    return createDemoTransaction({
      type:
        scenario === "agent"
          ? "Agent request"
          : scenario === "contract"
            ? "Contract interaction"
            : scenario === "compromise"
              ? "Wallet compromise"
              : "Sent",
      token: scenarioInput.token,
      amount: scenarioInput.amount,
      from: walletAddress,
      to: scenarioInput.to,
      assessment,
      status,
    });
  };

  const handleScenario = (scenario: DemoScenario) => {
    setMobileDemoOpen(false);
    const transaction = createScenarioTransaction(scenario);
    const assessment = {
      score: transaction.riskScore,
      level: transaction.riskLevel,
      reasons: transaction.reasons,
      decision:
        transaction.riskLevel === "Critical"
          ? ("block" as const)
          : transaction.riskLevel === "High"
            ? ("timelock" as const)
            : transaction.riskLevel === "Medium"
              ? ("review" as const)
              : ("allow" as const),
    };

    if (
      scenario === "normal" ||
      scenario === "large" ||
      scenario === "phishing"
    ) {
      setExperience({ kind: "analyze", transaction, assessment });
      return;
    }

    if (scenario === "contract") {
      addActivity(transaction);
      setExperience({ kind: "contract", transaction });
      return;
    }

    if (scenario === "agent") {
      addActivity(transaction);
      setExperience({ kind: "agent", transaction });
      return;
    }

    if (scenario === "compromise") {
      freezeWallet(transaction);
      setExperience({ kind: "frozen", transaction });
      return;
    }

    if (!pendingTransfer) {
      startTimeLock(transaction);
      setAwaitingGuardian();
    } else if (pendingTransfer.transaction.status !== "Awaiting Guardian") {
      setAwaitingGuardian();
    }
    setExperience({ kind: "guardian" });
  };

  const handleReset = () => {
    setExperience(null);
    setMobileDemoOpen(false);
    resetDemo();
  };

  return (
    <main className="wallet-page">
      <SimulationNotice />
      <div className="wallet-layout">
        <section className="wallet-frame">
          <header className="wallet-header">
            <Brand compact />
            <div className="network-label">
              <span />
              Moolo Demo Network
            </div>
            <div className="wallet-header-actions">
              <button
                className="icon-button mobile-demo-trigger"
                type="button"
                onClick={() => setMobileDemoOpen(true)}
                aria-label="Open demo menu"
              >
                <Menu size={19} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Open security settings"
                onClick={() => setView("shield")}
              >
                <Settings2 size={19} />
              </button>
            </div>
          </header>

          <section className="account-strip">
            <div className="account-avatar">D1</div>
            <div className="account-identity">
              <span>Demo Account 1</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                }}
                aria-label="Copy demo account address"
              >
                <code>{shortAddress(walletAddress)}</code>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
            <StatusBadge value={protectionState} />
          </section>

          {protectionState === "Frozen" && (
            <button
              className="freeze-banner"
              type="button"
              onClick={() =>
                handleScenario("compromise")
              }
            >
              <LockKeyhole size={18} aria-hidden="true" />
              <span>
                <strong>Wallet frozen</strong>
                Abnormal behavior detected. Start recovery to restore access.
              </span>
              <ChevronRight size={17} />
            </button>
          )}

          {pendingTransfer && (
            <button
              className="pending-banner"
              type="button"
              onClick={() =>
                setExperience({
                  kind:
                    pendingTransfer.transaction.status === "Awaiting Guardian"
                      ? "guardian"
                      : "timelock",
                })
              }
            >
              <Clock3 size={18} aria-hidden="true" />
              <span>
                <strong>{pendingTransfer.transaction.status}</strong>
                {pendingTransfer.transaction.amount.toLocaleString()}{" "}
                {pendingTransfer.transaction.token} is protected by Moolo.
              </span>
              <ChevronRight size={17} />
            </button>
          )}

          {view !== "send" && (
            <section className="balance-section">
              <span className="balance-label">
                Total portfolio
                <Eye size={15} aria-hidden="true" />
              </span>
              <h1>{formatCurrency(totalBalance)}</h1>
              <div className="portfolio-change">
                <span>+2.4%</span>
                Simulated today
              </div>
            </section>
          )}

          {view !== "send" && (
            <section className="wallet-actions" aria-label="Wallet actions">
              <ActionButton
                icon={Send}
                label="Send"
                primary
                disabled={protectionState !== "Protected"}
                onClick={() => setView("send")}
              />
              <ActionButton
                icon={ArrowDownToLine}
                label="Receive"
                onClick={() => setExperience({ kind: "receive" })}
              />
              <ActionButton
                icon={RefreshCw}
                label="Swap"
                onClick={() => setExperience({ kind: "swap" })}
              />
              <ActionButton
                icon={Shield}
                label="Shield"
                onClick={() => setView("shield")}
              />
            </section>
          )}

          {view === "send" ? (
            <SendView
              onCancel={() => setView("tokens")}
              onAnalyze={(transaction, assessment) =>
                setExperience({ kind: "analyze", transaction, assessment })
              }
            />
          ) : (
            <>
              <nav className="wallet-tabs" aria-label="Wallet content">
                {tabItems.map(({ id, label, icon: Icon }) => (
                  <button
                    className={view === id ? "active" : ""}
                    type="button"
                    key={id}
                    onClick={() => setView(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </nav>
              <AnimatePresence mode="wait">
                <motion.div
                  className="wallet-content"
                  key={view}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {view === "tokens" && <TokensView />}
                  {view === "activity" && (
                    <ActivityView
                      onSelect={(transaction) =>
                        setExperience({ kind: "activity", transaction })
                      }
                    />
                  )}
                  {view === "shield" && (
                    <ShieldView onFreeze={() => handleScenario("compromise")} />
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          <footer className="wallet-footer">
            <span>Rialo-ready concept</span>
            <span>Browser simulation only</span>
          </footer>
        </section>

        <DemoPanel onScenario={handleScenario} onReset={handleReset} />
      </div>

      <AnimatePresence>
        {experience && (
          <SecurityExperience
            experience={experience}
            onClose={() => setExperience(null)}
            onChange={setExperience}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileDemoOpen && (
          <motion.div
            className="mobile-demo-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mobile-demo-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
            >
              <button
                className="icon-button mobile-sheet-close"
                type="button"
                aria-label="Close demo menu"
                onClick={() => setMobileDemoOpen(false)}
              >
                <X size={19} />
              </button>
              <DemoPanel
                mobile
                onScenario={handleScenario}
                onReset={handleReset}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite">
        {copied ? "Demo wallet address copied." : ""}
      </div>
    </main>
  );
}

function TokensView() {
  const balances = useWalletStore((state) => state.balances);
  return (
    <div className="token-list">
      {TOKENS.map((token) => (
        <div className="token-row" key={token.symbol}>
          <span
            className="token-icon"
            style={{ "--token-color": token.accent } as React.CSSProperties}
          >
            {token.symbol.slice(0, 1)}
          </span>
          <div className="token-name">
            <strong>{token.name}</strong>
            <span>{token.symbol}</span>
          </div>
          <div className="token-balance">
            <strong>
              {balances[token.symbol].toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}
            </strong>
            <span>
              {formatCurrency(
                balances[token.symbol] * TOKEN_PRICES[token.symbol],
              )}
            </span>
          </div>
          <span className="token-change">+1.8%</span>
        </div>
      ))}
      <div className="guardian-card">
        <MooloMascot state="safe" size="small" />
        <div>
          <strong>Moolo is watching quietly</strong>
          <span>
            Every demo request is checked against your protection policies.
          </span>
        </div>
        <Sparkles size={16} aria-hidden="true" />
      </div>
    </div>
  );
}

function ActivityView({
  onSelect,
}: {
  onSelect: (transaction: DemoTransaction) => void;
}) {
  const activity = useWalletStore((state) => state.activity);
  if (activity.length === 0) {
    return (
      <div className="empty-state">
        <FileClock size={26} aria-hidden="true" />
        <strong>No activity yet</strong>
        <span>Run a scenario to create a simulated transaction.</span>
      </div>
    );
  }
  return (
    <div className="activity-list">
      {activity.map((transaction) => (
        <button
          className="activity-row"
          type="button"
          key={`${transaction.id}-${transaction.status}-${transaction.createdAt}`}
          onClick={() => onSelect(transaction)}
        >
          <span className={`activity-icon activity-${transaction.status.toLowerCase().replaceAll(" ", "-")}`}>
            {transaction.status === "Confirmed" ? (
              <ArrowUpRight size={17} />
            ) : transaction.status === "Agent Denied" ? (
              <Bot size={17} />
            ) : (
              <Shield size={17} />
            )}
          </span>
          <div className="activity-name">
            <strong>{transaction.type}</strong>
            <span>
              {new Date(transaction.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="activity-amount">
            <strong>
              {transaction.amount > 0
                ? `${transaction.amount.toLocaleString()} ${transaction.token}`
                : "Security event"}
            </strong>
            <StatusBadge value={transaction.status} />
          </div>
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ShieldView({ onFreeze }: { onFreeze: () => void }) {
  const settings = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const protectionState = useWalletStore((state) => state.protectionState);

  const toggles: Array<{
    key:
      | "protectionEnabled"
      | "blockSuspiciousAddresses"
      | "protectNewAddresses"
      | "emergencyFreeze";
    label: string;
    description: string;
  }> = [
    {
      key: "protectionEnabled",
      label: "Moolo Protection",
      description: "Run every simulated request through the risk engine.",
    },
    {
      key: "blockSuspiciousAddresses",
      label: "Block suspicious addresses",
      description: "Stop known malicious recipients automatically.",
    },
    {
      key: "protectNewAddresses",
      label: "Protect new addresses",
      description: "Add extra review for recipients without history.",
    },
    {
      key: "emergencyFreeze",
      label: "Emergency Freeze",
      description: "Pause sending when compromise signals appear.",
    },
  ];

  const numericSettings: Array<{
    key:
      | "largeTransferLimit"
      | "timeLockSeconds"
      | "guardianThreshold"
      | "aiAgentDailyLimit";
    label: string;
    suffix: string;
    min: number;
  }> = [
    {
      key: "largeTransferLimit",
      label: "Large Transfer Limit",
      suffix: "USDC",
      min: 1,
    },
    {
      key: "timeLockSeconds",
      label: "Time Lock Duration",
      suffix: "sec",
      min: 5,
    },
    {
      key: "guardianThreshold",
      label: "Guardian Approval Threshold",
      suffix: "USDC",
      min: 1,
    },
    {
      key: "aiAgentDailyLimit",
      label: "AI Agent Daily Limit",
      suffix: "USDC",
      min: 1,
    },
  ];

  return (
    <div className="shield-settings">
      <div className="shield-overview">
        <MooloMascot
          state={protectionState === "Frozen" ? "frozen" : "guard"}
          size="medium"
        />
        <div>
          <span className="eyebrow">Protection center</span>
          <strong>Your policies are active</strong>
          <p>
            These controls only change how the local simulation responds.
          </p>
        </div>
        <StatusBadge value={protectionState} />
      </div>
      <div className="setting-group">
        {toggles.map((item) => (
          <label className="toggle-row" key={item.key}>
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <input
              type="checkbox"
              checked={settings[item.key]}
              onChange={(event) =>
                updateSettings({ [item.key]: event.target.checked })
              }
            />
            <i aria-hidden="true" />
          </label>
        ))}
      </div>
      <div className="setting-group numeric-settings">
        {numericSettings.map((item) => (
          <label key={item.key}>
            <span>{item.label}</span>
            <div>
              <input
                type="number"
                min={item.min}
                value={settings[item.key]}
                onChange={(event) =>
                  updateSettings({
                    [item.key]: Math.max(
                      item.min,
                      Number(event.target.value) || item.min,
                    ),
                  })
                }
              />
              <small>{item.suffix}</small>
            </div>
          </label>
        ))}
      </div>
      <button
        className="danger-button full-button"
        type="button"
        onClick={onFreeze}
        disabled={!settings.emergencyFreeze}
      >
        <LockKeyhole size={17} aria-hidden="true" />
        Simulate Emergency Freeze
      </button>
    </div>
  );
}

function SendView({
  onCancel,
  onAnalyze,
}: {
  onCancel: () => void;
  onAnalyze: (
    transaction: DemoTransaction,
    assessment: ReturnType<typeof calculateRisk>,
  ) => void;
}) {
  const balances = useWalletStore((state) => state.balances);
  const settings = useWalletStore((state) => state.settings);
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [token, setToken] = useState<TokenSymbol>("USDC");
  const [recipient, setRecipient] = useState<string>(ADDRESSES.trusted);
  const [amount, setAmount] = useState("100");
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");

  const numericAmount = Number(amount);
  const addressType =
    recipient.toLowerCase() === ADDRESSES.phishing.toLowerCase()
      ? ("phishing" as const)
      : recipient.toLowerCase() === ADDRESSES.trusted.toLowerCase()
        ? ("trusted" as const)
        : ("new" as const);
  const assessment = calculateRisk({
    amount: numericAmount || 0,
    token,
    addressType,
    settings,
  });

  const validate = () => {
    if (!isEvmAddress(recipient)) {
      setError("Enter a valid 42-character EVM address.");
      return false;
    }
    if (recipient.toLowerCase() === walletAddress.toLowerCase()) {
      setError("Choose a different recipient from this demo wallet.");
      return false;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return false;
    }
    if (numericAmount > balances[token]) {
      setError(`You only have ${balances[token].toLocaleString()} ${token}.`);
      return false;
    }
    setError("");
    return true;
  };

  const handleReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validate()) setReviewing(true);
  };

  const handleConfirm = () => {
    const transaction = createDemoTransaction({
      token,
      amount: numericAmount,
      from: walletAddress,
      to: recipient,
      assessment,
      status:
        assessment.decision === "block"
          ? "Blocked"
          : assessment.decision === "timelock"
            ? "Timelocked"
            : "Confirmed",
    });
    onAnalyze(transaction, assessment);
  };

  if (reviewing) {
    return (
      <section className="send-view review-view">
        <button className="back-button" type="button" onClick={() => setReviewing(false)}>
          <ChevronDown size={17} aria-hidden="true" />
          Edit transfer
        </button>
        <span className="eyebrow">Step 2 of 2</span>
        <h2>Transaction review</h2>
        <p className="section-copy">
          Confirm the simulated request before Moolo runs its security checks.
        </p>
        <div className="review-amount">
          <span>Sending</span>
          <strong>
            {numericAmount.toLocaleString()} {token}
          </strong>
          <small>
            {formatCurrency(numericAmount * TOKEN_PRICES[token])}
          </small>
        </div>
        <div className="transaction-summary">
          <div className="detail-row">
            <span>From</span>
            <strong>{shortAddress(walletAddress)}</strong>
          </div>
          <div className="detail-row">
            <span>To</span>
            <strong>{shortAddress(recipient)}</strong>
          </div>
          <div className="detail-row">
            <span>Network fee</span>
            <strong>~0.0004 ETH</strong>
          </div>
          <div className="detail-row">
            <span>New address</span>
            <strong>{addressType === "new" ? "Yes" : "No"}</strong>
          </div>
          <div className="detail-row">
            <span>Estimated risk</span>
            <strong>
              <StatusBadge value={assessment.level} />
            </strong>
          </div>
        </div>
        <div className="applied-policies">
          <strong>Applied Moolo policies</strong>
          <span>
            <ShieldCheck size={14} /> Spending limit
          </span>
          <span>
            <ShieldCheck size={14} /> Address reputation
          </span>
          <span>
            <ShieldCheck size={14} /> Reactive decision
          </span>
        </div>
        <button className="primary-button full-button" type="button" onClick={handleConfirm}>
          Confirm & Run Security Check
          <ChevronRight size={17} aria-hidden="true" />
        </button>
        <button className="text-button" type="button" onClick={onCancel}>
          Cancel Transfer
        </button>
        <SimulationNotice compact />
      </section>
    );
  }

  return (
    <section className="send-view">
      <button className="back-button" type="button" onClick={onCancel}>
        <ChevronDown size={17} aria-hidden="true" />
        Wallet
      </button>
      <span className="eyebrow">Step 1 of 2</span>
      <h2>Send demo assets</h2>
      <p className="section-copy">
        Build a request, then watch Moolo analyze it before anything changes.
      </p>
      <form onSubmit={handleReview} noValidate>
        <fieldset className="asset-selector">
          <legend>Choose asset</legend>
          <div>
            {TOKENS.map((item) => (
              <button
                className={token === item.symbol ? "selected" : ""}
                type="button"
                key={item.symbol}
                onClick={() => {
                  setToken(item.symbol);
                  setAmount("");
                }}
              >
                <span
                  className="token-icon"
                  style={
                    { "--token-color": item.accent } as React.CSSProperties
                  }
                >
                  {item.symbol.slice(0, 1)}
                </span>
                <strong>{item.symbol}</strong>
                <small>
                  {balances[item.symbol].toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}
                </small>
              </button>
            ))}
          </div>
        </fieldset>
        <label className="form-label" htmlFor="recipient">
          Recipient address
        </label>
        <div className="address-input">
          <input
            id="recipient"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value.trim())}
            spellCheck="false"
            autoComplete="off"
            aria-describedby={error ? "send-error" : undefined}
          />
          <StatusBadge value={addressType === "phishing" ? "Critical" : addressType === "trusted" ? "Low" : "Medium"} />
        </div>
        <div className="quick-addresses" aria-label="Quick recipient choices">
          <button type="button" onClick={() => setRecipient(ADDRESSES.trusted)}>
            Trusted Address
          </button>
          <button
            type="button"
            onClick={() =>
              setRecipient(ADDRESSES.new)
            }
          >
            New Address
          </button>
          <button type="button" onClick={() => setRecipient(ADDRESSES.phishing)}>
            Phishing Address
          </button>
        </div>
        <label className="form-label" htmlFor="send-amount">
          Amount
        </label>
        <div className="amount-input">
          <input
            id="send-amount"
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            aria-describedby={error ? "send-error" : "amount-value"}
          />
          <button
            type="button"
            onClick={() => setAmount(String(balances[token]))}
          >
            Max
          </button>
          <strong>{token}</strong>
        </div>
        <div className="amount-meta" id="amount-value">
          <span>
            {formatCurrency((numericAmount || 0) * TOKEN_PRICES[token])}
          </span>
          <span>
            Balance: {balances[token].toLocaleString()} {token}
          </span>
        </div>
        {error && (
          <p className="field-error" id="send-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button full-button" type="submit">
          Review Transaction
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </form>
      <SimulationNotice compact />
    </section>
  );
}
