import assert from "node:assert/strict";
import test from "node:test";
import {
  clearMooloStorageArea,
  MOOLO_STORAGE_KEYS,
  type StorageLike,
} from "../lib/moolo-storage";
import {
  resetMooloDemoState,
  useWalletStore,
} from "../store/wallet-store";

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

test("reset clearing removes only Moolo state and preserves valid preferences", () => {
  const storage = new MemoryStorage();
  storage.setItem(MOOLO_STORAGE_KEYS.wallet, "saved-wallet");
  storage.setItem("moolo-wallet-v1", "legacy-wallet");
  storage.setItem("moolo-active-timer", "timer");
  storage.setItem("moolo-recovery", "recovery");
  storage.setItem("moolo-presenter-scenario", "scenario");
  storage.setItem("moolo-active-workflow", "workflow");
  storage.setItem(MOOLO_STORAGE_KEYS.soundPreference, "false");
  storage.setItem(MOOLO_STORAGE_KEYS.guidedNarration, "off");
  storage.setItem(MOOLO_STORAGE_KEYS.locale, "ko");
  storage.setItem("another-app", "keep-me");

  const result = clearMooloStorageArea(storage, true);

  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.wallet), null);
  assert.equal(storage.getItem("moolo-wallet-v1"), null);
  assert.equal(storage.getItem("moolo-active-timer"), null);
  assert.equal(storage.getItem("moolo-recovery"), null);
  assert.equal(storage.getItem("moolo-presenter-scenario"), null);
  assert.equal(storage.getItem("moolo-active-workflow"), null);
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.soundPreference), "false");
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.guidedNarration), "off");
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.locale), "ko");
  assert.equal(storage.getItem("another-app"), "keep-me");
  assert.ok(result.preserved.includes(MOOLO_STORAGE_KEYS.soundPreference));
  assert.ok(result.preserved.includes(MOOLO_STORAGE_KEYS.guidedNarration));
  assert.ok(result.preserved.includes(MOOLO_STORAGE_KEYS.locale));
});

test("an invalid sound preference is removed", () => {
  const storage = new MemoryStorage();
  storage.setItem(MOOLO_STORAGE_KEYS.soundPreference, "loud");
  clearMooloStorageArea(storage, true);
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.soundPreference), null);
});

test("an invalid locale is removed during reset clearing", () => {
  const storage = new MemoryStorage();
  storage.setItem(MOOLO_STORAGE_KEYS.locale, "jp");
  clearMooloStorageArea(storage, true);
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.locale), null);
});

test("an invalid narration preference is removed during reset clearing", () => {
  const storage = new MemoryStorage();
  storage.setItem(MOOLO_STORAGE_KEYS.guidedNarration, "sometimes");
  clearMooloStorageArea(storage, true);
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.guidedNarration), null);
});

test("reset restores the in-memory Zustand store to the welcome screen", () => {
  useWalletStore.setState({
    screen: "wallet",
    view: "activity",
    balances: { ETH: 0, USDC: 0, RLO: 0 },
    hasHydrated: true,
  });

  resetMooloDemoState();
  const state = useWalletStore.getState();
  assert.equal(state.screen, "welcome");
  assert.equal(state.view, "tokens");
  assert.equal(state.balances.USDC, 8_250);
  assert.equal(state.pendingTransfer, null);
  assert.equal(state.recovery, null);
  assert.equal(state.hasHydrated, true);
});
