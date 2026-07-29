import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";
import {
  formatLocaleCurrency,
  formatLocaleDateTime,
  formatLocaleNumber,
  formatLocaleTime,
} from "../lib/i18n/formatters";
import {
  readStoredLocale,
  writeStoredLocale,
} from "../lib/i18n/locale-storage";
import {
  isTranslationKey,
  translateKnownText,
  translateText,
} from "../lib/i18n/dictionaries";
import { normalizeLocale } from "../lib/i18n/types";
import {
  MOOLO_STORAGE_KEYS,
  type StorageLike,
} from "../lib/moolo-storage";
import {
  resetGuidedDemoState,
  useGuidedDemoStore,
} from "../store/guided-demo-store";
import { useLocaleStore } from "../store/locale-store";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

afterEach(() => {
  resetGuidedDemoState();
  useLocaleStore.setState({ locale: "ko", hasHydratedLocale: false });
});

test("Korean is the default and unsupported locale values recover to Korean", () => {
  assert.equal(normalizeLocale(undefined), "ko");
  assert.equal(normalizeLocale(null), "ko");
  assert.equal(normalizeLocale("jp"), "ko");
  assert.equal(normalizeLocale("en"), "en");
});

test("locale storage reads, writes, and safely normalizes invalid values", () => {
  const storage = new MemoryStorage();
  assert.equal(readStoredLocale(storage), "ko");

  writeStoredLocale(storage, "en");
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.locale), "en");
  assert.equal(readStoredLocale(storage), "en");

  storage.setItem(MOOLO_STORAGE_KEYS.locale, "broken");
  assert.equal(readStoredLocale(storage), "ko");
});

test("translations keep Rialo technology names in English", () => {
  assert.equal(
    translateText("ko", "Reactive execution"),
    "Reactive Transactions",
  );
  assert.equal(translateText("ko", "Native timers"), "Native Timers");
  assert.equal(
    translateKnownText("ko", "Reactive Recovery Workflow"),
    "Reactive Recovery Workflow",
  );
  assert.match(
    translateKnownText(
      "ko",
      "A simulated native timer delays execution without relying on an external automation service.",
    ),
    /Native Timer/,
  );
});

test("locale formatters use Korean and English Intl locales with safe date fallback", () => {
  assert.match(formatLocaleNumber("ko", 1234567.89), /1,234,567/);
  assert.match(formatLocaleNumber("en", 1234567.89), /1,234,567/);
  assert.match(formatLocaleCurrency("ko", 20477), /20,477/);
  assert.match(formatLocaleCurrency("en", 20477), /20,477/);
  assert.notEqual(
    formatLocaleDateTime("ko", Date.UTC(2026, 6, 28, 10, 30)),
    formatLocaleDateTime("en", Date.UTC(2026, 6, 28, 10, 30)),
  );
  assert.equal(formatLocaleDateTime("ko", Number.NaN), "시간 정보 없음");
  assert.equal(formatLocaleTime("ko", "bad"), "시간 정보 없음");
  assert.equal(formatLocaleDateTime("en", null), "Unknown time");
  assert.equal(formatLocaleTime("en", Number.POSITIVE_INFINITY), "Unknown time");
});

test("switching locale does not reset Guided Demo progress", () => {
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  const before = useGuidedDemoStore.getState();

  useLocaleStore.getState().setLocale("en");
  const after = useGuidedDemoStore.getState();

  assert.equal(after.active, before.active);
  assert.equal(after.currentStepIndex, before.currentStepIndex);
  assert.equal(after.phase, before.phase);
  assert.deepEqual(after.completedSteps, before.completedSteps);
  assert.equal(useLocaleStore.getState().locale, "en");
});

test("literal fallback translations on major surfaces exist in the central dictionary", async () => {
  const files = [
    "../components/demo/DemoPanel.tsx",
    "../components/guided-demo/GuidedDemoComplete.tsx",
    "../components/guided-demo/GuidedDemoPanel.tsx",
    "../components/guided-demo/GuidedDemoPresenterNote.tsx",
    "../components/guided-demo/GuidedDemoProgress.tsx",
    "../components/moolo/MooloMascot.tsx",
    "../components/rialo/RialoArchitecture.tsx",
    "../components/security/SecurityExperience.tsx",
    "../components/security/StatusBadge.tsx",
    "../components/wallet/SendView.tsx",
    "../components/wallet/WalletShell.tsx",
  ];
  const missing = new Set<string>();

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), "utf8");
    for (const match of source.matchAll(/\btx\(\s*"([^"]+)"/g)) {
      if (!isTranslationKey(match[1])) missing.add(match[1]);
    }
  }

  assert.deepEqual([...missing].sort(), []);
});
