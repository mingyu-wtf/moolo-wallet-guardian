"use client";

import { RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useTranslation } from "@/hooks/useTranslation";
import { getWalletHydrationDiagnostics } from "@/lib/hydration-diagnostics";
import {
  getMooloBrowserStorage,
  MOOLO_STORAGE_KEYS,
} from "@/lib/moolo-storage";
import {
  hydrateWalletStore,
  resetMooloDemoState,
} from "@/store/wallet-store";
import { hydrateLocaleStore } from "@/store/locale-store";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    hydrateLocaleStore();
  }, []);

  useEffect(() => {
    const restoreRetryCount = window.setTimeout(() => {
      const session = getMooloBrowserStorage("session");
      if (session) {
        try {
          const savedCount = Number(
            session.getItem(MOOLO_STORAGE_KEYS.errorRetryCount),
          );
          if (Number.isInteger(savedCount) && savedCount > 0) {
            setRetryCount(Math.min(savedCount, 2));
          }
        } catch {
          // Retry limiting remains in memory when storage is unavailable.
        }
      }
    }, 0);
    return () => window.clearTimeout(restoreRetryCount);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const hydration = getWalletHydrationDiagnostics();
      console.error(
        [
          "[Moolo runtime error]",
          `name: ${error.name}`,
          `message: ${error.message}`,
          `digest: ${error.digest ?? "none"}`,
          `hydrationPhase: ${hydration.phase}`,
          `hasHydrated: ${hydration.hasHydrated}`,
          `storageRead: ${hydration.storageRead}`,
          `storageParseFailed: ${hydration.storageParseFailed}`,
          `migrationStarted: ${hydration.migrationStarted}`,
          `migrationFailed: ${hydration.migrationFailed}`,
          `mergeStarted: ${hydration.mergeStarted}`,
          `recoveryReason: ${hydration.recoveryReason ?? "none"}`,
          `retryCount: ${retryCount}`,
          `stack:\n${error.stack ?? "unavailable"}`,
        ].join("\n"),
      );
    }
  }, [error, retryCount]);

  const tryAgain = () => {
    if (retryCount >= 2) return;
    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);
    const session = getMooloBrowserStorage("session");
    try {
      session?.setItem(
        MOOLO_STORAGE_KEYS.errorRetryCount,
        String(nextRetryCount),
      );
    } catch {
      // The in-memory counter still prevents an immediate retry loop.
    }

    void hydrateWalletStore().finally(reset);
  };

  const resetLocalDemo = () => {
    resetMooloDemoState();
    window.history.replaceState({}, "", window.location.pathname);
    reset();
  };

  return (
    <main className="error-screen">
      <section className="error-card" role="alert">
        <LanguageSwitcher compact />
        <ShieldAlert size={32} aria-hidden="true" />
        <span className="eyebrow">{t("Safe recovery")}</span>
        <h1>{t("Moolo hit a demo-only error")}</h1>
        <p>
          {t(
            "No real wallet or assets are connected. A saved demo state may be incompatible with this version.",
          )}
        </p>
        {retryCount >= 1 && (
          <p className="field-error" role="status">
            {t(
              "The saved demo state may be incompatible. Reset the local demo to continue safely.",
            )}
          </p>
        )}
        <button
          className="primary-button full-button"
          type="button"
          onClick={tryAgain}
          disabled={retryCount >= 2}
        >
          {t("Try again")}
        </button>
        <button
          className="secondary-button full-button"
          type="button"
          onClick={resetLocalDemo}
        >
          <RotateCcw size={17} aria-hidden="true" />
          {t("Reset local demo")}
        </button>
      </section>
    </main>
  );
}
