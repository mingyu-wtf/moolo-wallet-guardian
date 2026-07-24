"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { StatusBadge } from "@/components/security/StatusBadge";
import { ADDRESSES, TOKENS, TOKEN_PRICES } from "@/lib/constants";
import { calculateRisk } from "@/lib/risk-engine";
import {
  createDemoTransaction,
  formatCurrency,
  isEvmAddress,
  shortAddress,
} from "@/lib/simulation";
import { useWalletStore } from "@/store/wallet-store";
import type { DemoTransaction, TokenSymbol } from "@/types";

interface SendViewProps {
  onCancel: () => void;
  onAnalyze: (
    transaction: DemoTransaction,
    assessment: ReturnType<typeof calculateRisk>,
  ) => void;
}

export function SendView({ onCancel, onAnalyze }: SendViewProps) {
  const balances = useWalletStore((state) => state.balances);
  const settings = useWalletStore((state) => state.settings);
  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [token, setToken] = useState<TokenSymbol>("USDC");
  const [recipient, setRecipient] = useState<string>(ADDRESSES.trusted);
  const [amount, setAmount] = useState("100");
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    if (submitting) return;
    setSubmitting(true);
    const transaction = createDemoTransaction({
      token,
      amount: numericAmount,
      from: walletAddress,
      to: recipient,
      assessment,
      rialoKind: "manual",
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
        <button
          className="back-button"
          type="button"
          onClick={() => setReviewing(false)}
        >
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
            <span>Recipient</span>
            <strong>{shortAddress(recipient)}</strong>
          </div>
          <div className="detail-row">
            <span>Network</span>
            <strong>Rialo Concept Network</strong>
            <small>Simulation</small>
          </div>
          <div className="detail-row">
            <span>Network fee</span>
            <strong>~0.0004 ETH</strong>
          </div>
          <div className="detail-row">
            <span>Risk</span>
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
        <button
          className="primary-button full-button"
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
        >
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
          <StatusBadge
            value={
              addressType === "phishing"
                ? "Critical"
                : addressType === "trusted"
                  ? "Low"
                  : "Medium"
            }
          />
        </div>
        <div className="quick-addresses" aria-label="Quick recipient choices">
          <button type="button" onClick={() => setRecipient(ADDRESSES.trusted)}>
            Trusted Address
          </button>
          <button type="button" onClick={() => setRecipient(ADDRESSES.new)}>
            New Address
          </button>
          <button
            type="button"
            onClick={() => setRecipient(ADDRESSES.phishing)}
          >
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
