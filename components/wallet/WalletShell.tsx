"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  Bot,
  Check,
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
import { RialoPrimitiveGrid } from "@/components/rialo/RialoArchitecture";
import { RialoMark } from "@/components/rialo/RialoMark";
import {
  SecurityExperience,
  type SecurityExperienceState,
} from "@/components/security/SecurityExperience";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { StatusBadge } from "@/components/security/StatusBadge";
import { SendView } from "@/components/wallet/SendView";
import {
  ADDRESSES,
  SCENARIO_LABELS,
  TOKENS,
  TOKEN_PRICES,
} from "@/lib/constants";
import { calculateRisk } from "@/lib/risk-engine";
import {
  createDemoTransaction,
  formatCurrency,
  shortAddress,
} from "@/lib/simulation";
import { useWalletStore, type WalletView } from "@/store/wallet-store";
import type { DemoScenario, DemoTransaction } from "@/types";

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
  const activeScenario = useWalletStore((state) => state.activeScenario);
  const setActiveScenario = useWalletStore(
    (state) => state.setActiveScenario,
  );
  const addActivity = useWalletStore((state) => state.addActivity);
  const startTimeLock = useWalletStore((state) => state.startTimeLock);
  const setAwaitingGuardian = useWalletStore(
    (state) => state.setAwaitingGuardian,
  );
  const freezeWallet = useWalletStore((state) => state.freezeWallet);
  const [experience, setExperience] =
    useState<SecurityExperienceState | null>(null);
  const [mobileDemoOpen, setMobileDemoOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

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
      rialoKind: scenario,
      policies:
        scenario === "agent"
          ? ["AI agent daily limit", "Reactive decision"]
          : scenario === "compromise"
            ? ["Emergency freeze", "Guardian recovery"]
            : scenario === "contract"
              ? ["Contract verification", "Token approval limit"]
              : undefined,
    });
  };

  const handleScenario = (scenario: DemoScenario) => {
    if (
      protectionState !== "Protected" &&
      scenario !== "compromise"
    ) {
      setDemoMessage("Recover or reset the frozen wallet before starting another scenario.");
      return;
    }
    if (
      pendingTransfer &&
      scenario !== "guardian" &&
      scenario !== "compromise"
    ) {
      setDemoMessage("Finish, cancel, or send the pending transfer to a guardian first.");
      return;
    }
    setMobileDemoOpen(false);

    if (scenario === "compromise" && protectionState !== "Protected") {
      setActiveScenario(scenario);
      setDemoMessage(`${SCENARIO_LABELS[scenario].title} opened.`);
      const frozenTransaction =
        useWalletStore
          .getState()
          .activity.find((item) => item.status === "Frozen") ??
        createScenarioTransaction(scenario);
      setExperience({ kind: "frozen", transaction: frozenTransaction });
      return;
    }

    const transaction = createScenarioTransaction(scenario);
    if (transaction.amount > balances[transaction.token]) {
      setDemoMessage(
        `${SCENARIO_LABELS[scenario].title} needs ${transaction.amount.toLocaleString()} ${transaction.token}. Reset the demo to restore the starting balance.`,
      );
      return;
    }
    setActiveScenario(scenario);
    setDemoMessage(`${SCENARIO_LABELS[scenario].title} opened.`);
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
      const started = startTimeLock(transaction);
      if (!started) {
        setDemoMessage("The guardian request could not start until the current flow is resolved.");
        return;
      }
      setAwaitingGuardian();
    } else if (pendingTransfer.transaction.status !== "Awaiting Guardian") {
      setAwaitingGuardian();
    }
    setExperience({ kind: "guardian" });
  };

  const handleReset = () => {
    setMobileDemoOpen(false);
    setExperience({ kind: "reset-confirm" });
  };

  useEffect(() => {
    if (!mobileDemoOpen) return;
    const sheet = mobileSheetRef.current;
    const trigger = mobileTriggerRef.current;
    if (!sheet) return;
    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileDemoOpen(false);
        return;
      }
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [mobileDemoOpen]);

  return (
    <main className="wallet-page">
      <TimeLockMonitor />
      <SimulationNotice />
      <div className="wallet-layout">
        <section className="wallet-frame">
          <header className="wallet-header">
            <Brand compact showMascot={false} />
            <button
              className="network-label rialo-network-button"
              type="button"
              onClick={() => setExperience({ kind: "architecture" })}
              aria-label="Open Rialo architecture overview"
            >
              <RialoMark size="small" />
              <span className="rialo-network-copy">
                <strong>Rialo Concept Network</strong>
                <small>Simulation</small>
              </span>
            </button>
            <div className="wallet-header-actions">
              <button
                ref={mobileTriggerRef}
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

          {protectionState !== "Protected" && (
            <button
              className="freeze-banner"
              type="button"
              onClick={() =>
                handleScenario("compromise")
              }
            >
              <LockKeyhole size={18} aria-hidden="true" />
              <span>
                <strong>
                  {protectionState === "Recovering"
                    ? "Recovery in progress"
                    : "Wallet frozen"}
                </strong>
                {protectionState === "Recovering"
                  ? "Open the recovery flow to finish protecting the new wallet."
                  : "Abnormal behavior detected. Start recovery to restore access."}
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
                    <ShieldView
                      onFreeze={() => handleScenario("compromise")}
                      onArchitecture={() =>
                        setExperience({ kind: "architecture" })
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </>
          )}

          <footer className="wallet-footer">
            <span>Designed for Rialo</span>
            <span>Architecture simulation only</span>
          </footer>
        </section>

        <DemoPanel
          onScenario={handleScenario}
          onReset={handleReset}
          activeScenario={activeScenario}
          protectionState={protectionState}
          pendingStatus={pendingTransfer?.transaction.status ?? null}
          message={demoMessage}
          busy={experience !== null}
        />
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
              ref={mobileSheetRef}
              className="mobile-demo-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Demo control panel"
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
                activeScenario={activeScenario}
                protectionState={protectionState}
                pendingStatus={pendingTransfer?.transaction.status ?? null}
                message={demoMessage}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sr-only" aria-live="polite">
        {copied ? "Demo wallet address copied." : demoMessage}
      </div>
    </main>
  );
}

function TimeLockMonitor() {
  const pending = useWalletStore((state) => state.pendingTransfer);
  const completeTimeLock = useWalletStore((state) => state.completeTimeLock);

  useEffect(() => {
    if (!pending || pending.transaction.status !== "Timelocked") return;
    const delay = Math.max(0, pending.endsAt - Date.now());
    const timer = window.setTimeout(
      completeTimeLock,
      Math.min(delay, 2_147_000_000),
    );
    return () => window.clearTimeout(timer);
  }, [completeTimeLock, pending]);

  return null;
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
        <ShieldCheck size={22} aria-hidden="true" />
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
          key={transaction.id}
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

function ShieldView({
  onFreeze,
  onArchitecture,
}: {
  onFreeze: () => void;
  onArchitecture: () => void;
}) {
  const settings = useWalletStore((state) => state.settings);
  const updateSettings = useWalletStore((state) => state.updateSettings);
  const protectionState = useWalletStore((state) => state.protectionState);
  const [saveMessage, setSaveMessage] = useState("");

  const saveSettings = (next: Parameters<typeof updateSettings>[0]) => {
    updateSettings(next);
    setSaveMessage("Protection settings saved in this browser.");
    window.setTimeout(() => setSaveMessage(""), 1800);
  };

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
          <strong>
            {settings.protectionEnabled
              ? "Your policies are active"
              : "Optional protection is off"}
          </strong>
          <p>
            These controls only change how the local simulation responds.
          </p>
        </div>
        <StatusBadge value={protectionState} />
      </div>
      {!settings.protectionEnabled && (
        <div className="protection-off-note" role="status">
          Optional spending, new-address, and agent policies are paused.
          Critical phishing addresses remain blocked for demo safety.
        </div>
      )}
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
                saveSettings({ [item.key]: event.target.checked })
              }
              aria-label={`${item.label}: ${settings[item.key] ? "on" : "off"}`}
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
                  saveSettings({
                    [item.key]: Math.max(
                      item.min,
                      Number(event.target.value) || item.min,
                    ),
                  })
                }
                aria-label={item.label}
              />
              <small>{item.suffix}</small>
            </div>
          </label>
        ))}
      </div>
      <div className="settings-save-status" aria-live="polite">
        {saveMessage}
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
      <section className="why-rialo-card">
        <div className="why-rialo-heading">
          <RialoMark size="medium" />
          <div>
            <span className="eyebrow">Rialo Concept Demo</span>
            <strong>Why Rialo?</strong>
            <p>
              Moolo combines multiple Rialo-native concepts into one wallet
              protection workflow.
            </p>
          </div>
        </div>
        <RialoPrimitiveGrid compact />
        <button
          className="secondary-button full-button"
          type="button"
          onClick={onArchitecture}
        >
          Explore the architecture
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
