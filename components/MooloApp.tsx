"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/moolo/Brand";
import { MooloMascot } from "@/components/moolo/MooloMascot";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { WalletShell } from "@/components/wallet/WalletShell";
import { useWalletStore } from "@/store/wallet-store";

const screenMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28 },
};

export function MooloApp() {
  const screen = useWalletStore((state) => state.screen);
  const hasHydrated = useWalletStore((state) => state.hasHydrated);
  const enterDemo = useWalletStore((state) => state.enterDemo);
  const unlock = useWalletStore((state) => state.unlock);
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    void useWalletStore.persist.rehydrate();
  }, []);

  if (!hasHydrated) {
    return (
      <main className="loading-screen" role="status" aria-live="polite">
        <MooloMascot state="waiting" size="large" />
        <strong>Waking up your guardian…</strong>
      </main>
    );
  }

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setUnlockError("Enter any demo password to continue.");
      return;
    }
    setUnlockError("");
    unlock();
  };

  return (
    <AnimatePresence mode="wait">
      {screen === "welcome" && (
        <motion.main
          className="welcome-screen"
          key="welcome"
          {...screenMotion}
        >
          <nav className="welcome-nav">
            <Brand showMascot={false} />
            <span className="builders-pill">
              <ShieldCheck size={14} aria-hidden="true" />
              Rialo Builders Hub
            </span>
          </nav>
          <section className="welcome-hero">
            <div className="welcome-copy">
              <span className="eyebrow">Your wallet has a new best friend</span>
              <h1>
                Security that reacts
                <br />{" "}
                <em>before you regret it.</em>
              </h1>
              <p className="welcome-lead">
                Moolo is an interactive wallet security simulator. No wallet
                extension, signature, or real assets are required.
              </p>
              <SimulationNotice />
              <button
                className="primary-button welcome-cta"
                type="button"
                onClick={enterDemo}
                data-testid="enter-demo"
              >
                Enter Demo Wallet
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <div className="welcome-proof">
                <span>Reactive execution</span>
                <span>Native timers</span>
                <span>Privacy-first</span>
              </div>
            </div>
            <div className="mascot-stage" aria-hidden="true">
              <span className="orbit orbit-one" />
              <span className="orbit orbit-two" />
              <div className="mascot-hero-card">
                <MooloMascot state="guard" size="large" />
                <span className="floating-check">✓</span>
                <span className="floating-lock">⌁</span>
              </div>
              <div className="stage-note stage-note-top">
                <span className="status-pulse" />
                Wallet protected
              </div>
              <div className="stage-note stage-note-bottom">
                <strong>0 threats</strong>
                <span>Nothing gets past Moolo</span>
              </div>
            </div>
          </section>
        </motion.main>
      )}

      {screen === "unlock" && (
        <motion.main
          className="unlock-screen"
          key="unlock"
          {...screenMotion}
        >
          <section className="unlock-card">
            <Brand showMascot={false} />
            <div className="unlock-mascot">
              <MooloMascot state="waiting" size="large" />
            </div>
            <span className="eyebrow">Demo Wallet</span>
            <h1>Welcome back</h1>
            <p>
              This familiar unlock step is only for the experience. Nothing is
              authenticated or sent anywhere.
            </p>
            <form onSubmit={handleUnlock} noValidate>
              <label htmlFor="demo-password">Password</label>
              <div className="input-with-icon">
                <KeyRound size={17} aria-hidden="true" />
                <input
                  id="demo-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter any demo password"
                  autoComplete="off"
                  aria-describedby={unlockError ? "unlock-error" : undefined}
                />
              </div>
              {unlockError && (
                <p className="field-error" id="unlock-error" role="alert">
                  {unlockError}
                </p>
              )}
              <button className="primary-button full-button" type="submit">
                Unlock Demo Wallet
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </form>
            <SimulationNotice compact />
          </section>
        </motion.main>
      )}

      {screen === "wallet" && (
        <motion.div key="wallet" {...screenMotion}>
          <WalletShell />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
