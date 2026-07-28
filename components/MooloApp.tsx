"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, KeyRound } from "lucide-react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Brand } from "@/components/moolo/Brand";
import { LandingMooloRoamer } from "@/components/moolo/LandingMooloRoamer";
import { MooloMascot } from "@/components/moolo/MooloMascot";
import { RialoMark } from "@/components/rialo/RialoMark";
import { SimulationNotice } from "@/components/security/SimulationNotice";
import { WalletShell } from "@/components/wallet/WalletShell";
import {
  forceWalletHydrationFallback,
  hydrateWalletStore,
  useWalletStore,
} from "@/store/wallet-store";
import { hydrateLocaleStore } from "@/store/locale-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

const screenMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28 },
};

const landingReveal = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.58,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const landingCopySequence = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.26,
      staggerChildren: 0.11,
    },
  },
};

const landingNavMotion = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const landingBadgeMotion = {
  hidden: { opacity: 0, y: -8, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.12,
      duration: 0.48,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const landingStageMotion = {
  hidden: { opacity: 0, y: 28, scale: 0.965 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.96,
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const landingTopNoteMotion = {
  hidden: { opacity: 0, x: -14, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      delay: 1.18,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const landingBottomNoteMotion = {
  hidden: { opacity: 0, x: 14, y: 8, scale: 0.96 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      delay: 1.3,
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function MooloApp() {
  const { t } = useTranslation();
  const screen = useWalletStore((state) => state.screen);
  const hasHydrated = useWalletStore((state) => state.hasHydrated);
  const enterDemo = useWalletStore((state) => state.enterDemo);
  const unlock = useWalletStore((state) => state.unlock);
  const reduceMotion = useReducedMotion();
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] =
    useState<TranslationKey | null>(null);
  const [forceDevelopmentError, setForceDevelopmentError] = useState(false);
  const [landingExiting, setLandingExiting] = useState(false);
  const landingExitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    hydrateLocaleStore();
    let active = true;
    const hydrationTimeout = window.setTimeout(() => {
      if (!active) return;
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[Moolo hydration] Timed out; restored the default demo state.",
        );
      }
      forceWalletHydrationFallback("Hydration timed out");
    }, 5_000);

    const hydrate = async () => {
      if (process.env.NODE_ENV === "development") {
        const { applyDevelopmentPersistenceFixture } = await import(
          "@/lib/dev-persistence-fixtures"
        );
        if (active) {
          setForceDevelopmentError(applyDevelopmentPersistenceFixture());
        }
      }
      await hydrateWalletStore();
      window.clearTimeout(hydrationTimeout);
    };
    void hydrate();

    return () => {
      active = false;
      window.clearTimeout(hydrationTimeout);
    };
  }, []);

  useEffect(
    () => () => {
      if (landingExitTimeoutRef.current !== null) {
        window.clearTimeout(landingExitTimeoutRef.current);
      }
    },
    [],
  );

  if (!hasHydrated) {
    return (
      <main className="loading-screen" role="status" aria-live="polite">
        <MooloMascot state="waiting" size="large" />
        <strong>{t("Waking up your guardian…")}</strong>
      </main>
    );
  }

  if (process.env.NODE_ENV === "development" && forceDevelopmentError) {
    throw new Error("Intentional Moolo development error");
  }

  const handleUnlock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim()) {
      setUnlockError("Enter any demo password to continue.");
      return;
    }
    setUnlockError(null);
    unlock();
  };

  const handleEnterDemo = () => {
    if (landingExiting) return;
    setLandingExiting(true);
    landingExitTimeoutRef.current = window.setTimeout(
      () => {
        landingExitTimeoutRef.current = null;
        enterDemo();
        setLandingExiting(false);
      },
      reduceMotion ? 0 : 220,
    );
  };

  return (
    <AnimatePresence mode="wait">
      {screen === "welcome" && (
        <motion.main
          className="welcome-screen"
          key="welcome"
          {...screenMotion}
        >
          <motion.nav
            className="welcome-nav"
            initial={reduceMotion ? false : "hidden"}
            animate="visible"
            variants={landingNavMotion}
          >
            <Brand showMascot={false} />
            <motion.div
              className="welcome-nav-actions"
              variants={landingBadgeMotion}
            >
              <span className="builders-pill">
                <RialoMark size="small" />
                {t("Rialo Builders Hub")}
              </span>
              <LanguageSwitcher compact />
            </motion.div>
          </motion.nav>
          <section className="welcome-hero">
            <motion.div
              className="welcome-copy"
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={landingCopySequence}
            >
              <motion.span className="eyebrow" variants={landingReveal}>
                {t("Your wallet has a new best friend")}
              </motion.span>
              <motion.h1 variants={landingReveal}>
                <span className="welcome-headline-line">
                  {t("Security that reacts")}
                </span>
                <span className="welcome-headline-line">
                  <em>{t("before you regret it.")}</em>
                </span>
              </motion.h1>
              <motion.p className="welcome-lead" variants={landingReveal}>
                {t(
                  "Moolo is an interactive wallet security simulator. No wallet extension, signature, or real assets are required.",
                )}
              </motion.p>
              <motion.div
                className="welcome-notice-slot"
                variants={landingReveal}
              >
                <SimulationNotice />
              </motion.div>
              <motion.button
                className="primary-button welcome-cta"
                type="button"
                onClick={handleEnterDemo}
                disabled={landingExiting}
                data-testid="enter-demo"
                variants={landingReveal}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.985, y: 0 }}
              >
                {t("Enter Demo Wallet")}
                <ArrowRight size={18} aria-hidden="true" />
              </motion.button>
              <motion.div className="welcome-proof" variants={landingReveal}>
                <span>{t("Reactive execution")}</span>
                <span>{t("Native timers")}</span>
                <span>{t("Privacy-first")}</span>
              </motion.div>
              <motion.div className="welcome-rialo" variants={landingReveal}>
                <RialoMark size="medium" showLabel />
                <span>
                  <strong>{t("Designed for Rialo")}</strong>
                  <small>{t("Rialo Architecture Simulation")}</small>
                </span>
              </motion.div>
            </motion.div>
            <div className="mascot-stage">
              <span className="orbit orbit-one" />
              <span className="orbit orbit-two" />
              <motion.div
                className="mascot-hero-card"
                aria-hidden="true"
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={landingStageMotion}
              >
                <span className="floating-check">✓</span>
                <span className="floating-lock">⌁</span>
              </motion.div>
              <motion.div
                className="stage-note stage-note-top"
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={landingTopNoteMotion}
              >
                <span className="status-pulse" />
                {t("Wallet protected")}
              </motion.div>
              <motion.div
                className="stage-note stage-note-bottom"
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
                variants={landingBottomNoteMotion}
              >
                <strong>{t("0 threats")}</strong>
                <span>{t("Nothing gets past Moolo")}</span>
              </motion.div>
            </div>
          </section>
          <LandingMooloRoamer state="idle" exiting={landingExiting} />
        </motion.main>
      )}

      {screen === "unlock" && (
        <motion.main
          className="unlock-screen"
          key="unlock"
          {...screenMotion}
        >
          <section className="unlock-card">
            <div className="unlock-card-topline">
              <Brand showMascot={false} />
              <LanguageSwitcher compact />
            </div>
            <div className="unlock-rialo">
              <RialoMark size="small" />
              <span>
                <strong>{t("Rialo Concept Demo")}</strong>
                <small>{t("Architecture simulation")}</small>
              </span>
            </div>
            <div className="unlock-mascot">
              <MooloMascot state="waiting" size="large" />
            </div>
            <span className="eyebrow">{t("Demo Wallet")}</span>
            <h1>{t("Welcome back")}</h1>
            <p>
              {t(
                "This familiar unlock step is only for the experience. Nothing is authenticated or sent anywhere.",
              )}
            </p>
            <form onSubmit={handleUnlock} noValidate>
              <label htmlFor="demo-password">{t("Password")}</label>
              <div className="input-with-icon">
                <KeyRound size={17} aria-hidden="true" />
                <input
                  id="demo-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("Enter any demo password")}
                  autoComplete="off"
                  aria-describedby={unlockError ? "unlock-error" : undefined}
                />
              </div>
              {unlockError && (
                <p className="field-error" id="unlock-error" role="alert">
                  {t(unlockError)}
                </p>
              )}
              <button className="primary-button full-button" type="submit">
                {t("Unlock Demo Wallet")}
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
