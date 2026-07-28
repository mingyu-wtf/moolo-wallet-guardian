import type { Locale } from "@/lib/i18n/types";
import type { StorageLike } from "@/lib/moolo-storage";

export type NarrationStatus =
  | "idle"
  | "loading-voices"
  | "speaking"
  | "paused"
  | "unavailable"
  | "error";

export type NarrationPreference = "on" | "off";

export interface NarrationVoiceConfig {
  lang: "ko-KR" | "en-US";
  rate: number;
  pitch: number;
  volume: number;
}

export interface SpeechSynthesisAdapter {
  cancel: () => void;
  getVoices: () => SpeechSynthesisVoice[];
  pause: () => void;
  resume: () => void;
  speak: (utterance: SpeechSynthesisUtterance) => void;
  addEventListener: (
    type: "voiceschanged",
    listener: EventListener,
  ) => void;
  removeEventListener: (
    type: "voiceschanged",
    listener: EventListener,
  ) => void;
}

interface NarratorOptions {
  synthesis: SpeechSynthesisAdapter;
  createUtterance: (text: string) => SpeechSynthesisUtterance;
  onStatusChange?: (status: NarrationStatus) => void;
  onError?: (error: unknown) => void;
  replayCooldownMs?: number;
}

export const DEFAULT_NARRATION_PREFERENCE: NarrationPreference = "on";

export function normalizeNarrationPreference(
  value: unknown,
): NarrationPreference {
  return value === "off" || value === "on"
    ? value
    : DEFAULT_NARRATION_PREFERENCE;
}

export function readNarrationPreference(
  storage: StorageLike | null,
  key: string,
): NarrationPreference {
  if (!storage) return DEFAULT_NARRATION_PREFERENCE;
  try {
    return normalizeNarrationPreference(storage.getItem(key));
  } catch {
    return DEFAULT_NARRATION_PREFERENCE;
  }
}

export function writeNarrationPreference(
  storage: StorageLike | null,
  key: string,
  value: NarrationPreference,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, normalizeNarrationPreference(value));
  } catch {
    // Narration remains available in memory when browser storage is blocked.
  }
}

export function hasSpeechSynthesisSupport(
  scope: unknown = typeof window === "undefined" ? undefined : window,
): boolean {
  if (!scope || typeof scope !== "object") return false;
  const candidate = scope as {
    speechSynthesis?: unknown;
    SpeechSynthesisUtterance?: unknown;
  };
  return (
    Boolean(candidate.speechSynthesis) &&
    typeof candidate.SpeechSynthesisUtterance === "function"
  );
}

export function getNarrationVoiceConfig(
  locale: Locale,
): NarrationVoiceConfig {
  return locale === "ko"
    ? {
        lang: "ko-KR",
        rate: 0.92,
        pitch: 1.02,
        volume: 0.9,
      }
    : {
        lang: "en-US",
        rate: 0.96,
        pitch: 1,
        volume: 0.9,
      };
}

function normalizedVoiceLanguage(voice: SpeechSynthesisVoice): string {
  return voice.lang.replaceAll("_", "-").toLowerCase();
}

export function selectNarrationVoice(
  voices: readonly SpeechSynthesisVoice[],
  locale: Locale,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const exactLanguage = locale === "ko" ? "ko-kr" : "en-us";
  const languagePrefix = locale === "ko" ? "ko" : "en";
  const exact = voices.find(
    (voice) => normalizedVoiceLanguage(voice) === exactLanguage,
  );
  if (exact) return exact;

  const matchingLanguage = voices.find((voice) =>
    normalizedVoiceLanguage(voice).startsWith(languagePrefix),
  );
  if (matchingLanguage) return matchingLanguage;

  if (locale === "ko") {
    const namedKoreanVoice = voices.find((voice) =>
      /korean|한국|한국어/i.test(voice.name),
    );
    if (namedKoreanVoice) return namedKoreanVoice;
  } else {
    const defaultEnglishVoice = voices.find(
      (voice) =>
        voice.default &&
        normalizedVoiceLanguage(voice).startsWith("en"),
    );
    if (defaultEnglishVoice) return defaultEnglishVoice;
  }

  return voices.find((voice) => voice.default) ?? null;
}

export function splitNarrationText(text: string): string[] {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return [];
  return (
    normalized.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g) ?? [
      normalized,
    ]
  )
    .map((part) => part.trim())
    .filter(Boolean);
}

export class GuidedDemoNarrator {
  private readonly synthesis: SpeechSynthesisAdapter;
  private readonly createUtterance: (
    text: string,
  ) => SpeechSynthesisUtterance;
  private readonly onStatusChange?: (status: NarrationStatus) => void;
  private readonly onError?: (error: unknown) => void;
  private readonly replayCooldownMs: number;
  private readonly handleVoicesChanged: EventListener;
  private voices: SpeechSynthesisVoice[] = [];
  private generation = 0;
  private destroyed = false;
  private lastReplayAt = Number.NEGATIVE_INFINITY;

  constructor(options: NarratorOptions) {
    this.synthesis = options.synthesis;
    this.createUtterance = options.createUtterance;
    this.onStatusChange = options.onStatusChange;
    this.onError = options.onError;
    this.replayCooldownMs = options.replayCooldownMs ?? 500;
    this.handleVoicesChanged = () => this.loadVoices();
    this.synthesis.addEventListener(
      "voiceschanged",
      this.handleVoicesChanged,
    );
    this.loadVoices();
  }

  loadVoices(): SpeechSynthesisVoice[] {
    if (this.destroyed) return [];
    try {
      this.voices = this.synthesis.getVoices();
      this.emitStatus(
        this.voices.length > 0 ? "idle" : "loading-voices",
      );
    } catch (error) {
      this.voices = [];
      this.emitStatus("error");
      this.onError?.(error);
    }
    return this.voices;
  }

  speak(text: string, locale: Locale): boolean {
    if (this.destroyed) return false;
    const chunks = splitNarrationText(text);
    if (chunks.length === 0) return false;

    this.cancel();
    const generation = this.generation;
    this.speakChunk(chunks, 0, locale, generation);
    return true;
  }

  replay(text: string, locale: Locale, now = Date.now()): boolean {
    if (now - this.lastReplayAt < this.replayCooldownMs) return false;
    this.lastReplayAt = now;
    return this.speak(text, locale);
  }

  cancel(): void {
    if (this.destroyed) return;
    this.generation += 1;
    try {
      this.synthesis.cancel();
    } catch (error) {
      this.onError?.(error);
    }
    this.emitStatus("idle");
  }

  pause(): void {
    if (this.destroyed) return;
    try {
      this.synthesis.pause();
      this.emitStatus("paused");
    } catch (error) {
      this.emitStatus("error");
      this.onError?.(error);
    }
  }

  resume(): void {
    if (this.destroyed) return;
    try {
      this.synthesis.resume();
      this.emitStatus("speaking");
    } catch (error) {
      this.emitStatus("error");
      this.onError?.(error);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.cancel();
    this.synthesis.removeEventListener(
      "voiceschanged",
      this.handleVoicesChanged,
    );
    this.destroyed = true;
  }

  private speakChunk(
    chunks: string[],
    index: number,
    locale: Locale,
    generation: number,
  ): void {
    if (this.destroyed || generation !== this.generation) return;
    if (index >= chunks.length) {
      this.emitStatus("idle");
      return;
    }

    try {
      const utterance = this.createUtterance(chunks[index]);
      const config = getNarrationVoiceConfig(locale);
      utterance.lang = config.lang;
      utterance.rate = config.rate;
      utterance.pitch = config.pitch;
      utterance.volume = config.volume;
      utterance.voice = selectNarrationVoice(this.voices, locale);
      utterance.onstart = () => {
        if (generation === this.generation) {
          this.emitStatus("speaking");
        }
      };
      utterance.onend = () => {
        if (generation !== this.generation) return;
        this.speakChunk(chunks, index + 1, locale, generation);
      };
      utterance.onerror = (event) => {
        if (generation !== this.generation) return;
        if (event.error === "canceled" || event.error === "interrupted") {
          this.emitStatus("idle");
          return;
        }
        this.generation += 1;
        this.emitStatus("error");
        this.onError?.(event);
      };
      this.synthesis.speak(utterance);
    } catch (error) {
      if (generation !== this.generation) return;
      this.generation += 1;
      this.emitStatus("error");
      this.onError?.(error);
    }
  }

  private emitStatus(status: NarrationStatus): void {
    this.onStatusChange?.(status);
  }
}
