"use client";

import { Languages } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({
  compact = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();
  const status =
    locale === "ko"
      ? t("Language changed to Korean.")
      : t("Language changed to English.");

  return (
    <div
      className={`language-switcher ${compact ? "is-compact" : ""}`}
      aria-label={t("Switch language")}
    >
      <Languages size={15} aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLocale("ko")}
        aria-pressed={locale === "ko"}
      >
        {compact ? "KO" : t("한국어")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        {compact ? "EN" : t("English")}
      </button>
      <span className="sr-only" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
