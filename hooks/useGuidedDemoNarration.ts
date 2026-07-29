"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GuidedDemoNarrator,
  hasSpeechSynthesisSupport,
  readNarrationPreference,
  writeNarrationPreference,
  type NarrationStatus,
} from "@/lib/speech/guided-demo-narrator";
import type { Locale } from "@/lib/i18n/types";
import {
  getMooloBrowserStorage,
  MOOLO_RESET_EVENT,
  MOOLO_STORAGE_KEYS,
} from "@/lib/moolo-storage";

export interface GuidedDemoNarrationControls {
  enabled: boolean;
  status: NarrationStatus;
  supported: boolean | null;
  speakNarration: (text: string) => boolean;
  cancelNarration: () => void;
  pauseNarration: () => void;
  resumeNarration: () => void;
  replayNarration: (text: string) => boolean;
  toggleNarration: (currentText?: string) => void;
}

export function useGuidedDemoNarration(
  locale: Locale,
): GuidedDemoNarrationControls {
  const [enabled, setEnabled] = useState(
    () =>
      readNarrationPreference(
        getMooloBrowserStorage("local"),
        MOOLO_STORAGE_KEYS.guidedNarration,
      ) === "on",
  );
  const [supported] = useState<boolean | null>(() =>
    typeof window === "undefined"
      ? null
      : hasSpeechSynthesisSupport(window),
  );
  const [status, setStatus] = useState<NarrationStatus>(() =>
    typeof window !== "undefined" &&
    !hasSpeechSynthesisSupport(window)
      ? "unavailable"
      : "loading-voices",
  );
  const narratorRef = useRef<GuidedDemoNarrator | null>(null);
  const enabledRef = useRef(enabled);
  const localeRef = useRef(locale);
  const mountedRef = useRef(false);

  const cancelNarration = useCallback(() => {
    narratorRef.current?.cancel();
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!hasSpeechSynthesisSupport(window)) {
      return () => {
        mountedRef.current = false;
      };
    }

    narratorRef.current = new GuidedDemoNarrator({
      synthesis: window.speechSynthesis,
      createUtterance: (text) => new SpeechSynthesisUtterance(text),
      onStatusChange: (nextStatus) => {
        if (mountedRef.current) setStatus(nextStatus);
      },
      onError: (error) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("[Moolo narration] Speech playback unavailable", error);
        }
      },
    });

    const cancelForNavigation = () => narratorRef.current?.cancel();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") cancelForNavigation();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", cancelForNavigation);
    window.addEventListener("popstate", cancelForNavigation);
    window.addEventListener(MOOLO_RESET_EVENT, cancelForNavigation);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", cancelForNavigation);
      window.removeEventListener("popstate", cancelForNavigation);
      window.removeEventListener(MOOLO_RESET_EVENT, cancelForNavigation);
      narratorRef.current?.destroy();
      narratorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (localeRef.current === locale) return;
    localeRef.current = locale;
    cancelNarration();
  }, [cancelNarration, locale]);

  const speakNarration = useCallback((text: string) => {
    if (
      !enabledRef.current ||
      !narratorRef.current ||
      document.visibilityState === "hidden"
    ) {
      return false;
    }
    return narratorRef.current.speak(text, localeRef.current);
  }, []);

  const replayNarration = useCallback((text: string) => {
    if (
      !enabledRef.current ||
      !narratorRef.current ||
      document.visibilityState === "hidden"
    ) {
      return false;
    }
    return narratorRef.current.replay(text, localeRef.current);
  }, []);

  const pauseNarration = useCallback(() => {
    narratorRef.current?.pause();
  }, []);

  const resumeNarration = useCallback(() => {
    narratorRef.current?.resume();
  }, []);

  const toggleNarration = useCallback((currentText?: string) => {
    const nextEnabled = !enabledRef.current;
    enabledRef.current = nextEnabled;
    setEnabled(nextEnabled);
    writeNarrationPreference(
      getMooloBrowserStorage("local"),
      MOOLO_STORAGE_KEYS.guidedNarration,
      nextEnabled ? "on" : "off",
    );

    if (!nextEnabled) {
      narratorRef.current?.cancel();
      return;
    }
    if (
      currentText &&
      narratorRef.current &&
      document.visibilityState !== "hidden"
    ) {
      narratorRef.current.speak(currentText, localeRef.current);
    }
  }, []);

  return {
    enabled,
    status,
    supported,
    speakNarration,
    cancelNarration,
    pauseNarration,
    resumeNarration,
    replayNarration,
    toggleNarration,
  };
}
