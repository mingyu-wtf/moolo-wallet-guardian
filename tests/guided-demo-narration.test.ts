import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import {
  getGuidedDemoNarration,
  GUIDED_DEMO_STEPS,
} from "../lib/guided-demo";
import {
  GuidedDemoNarrator,
  getNarrationVoiceConfig,
  hasSpeechSynthesisSupport,
  normalizeNarrationPreference,
  readNarrationPreference,
  selectNarrationVoice,
  splitNarrationText,
  writeNarrationPreference,
  type NarrationStatus,
  type SpeechSynthesisAdapter,
} from "../lib/speech/guided-demo-narrator";
import {
  MOOLO_STORAGE_KEYS,
  type StorageLike,
} from "../lib/moolo-storage";
import {
  resetGuidedDemoState,
  useGuidedDemoStore,
} from "../store/guided-demo-store";

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

function voice(
  name: string,
  lang: string,
  isDefault = false,
): SpeechSynthesisVoice {
  return {
    default: isDefault,
    lang,
    localService: true,
    name,
    voiceURI: `${lang}:${name}`,
  };
}

function utterance(text: string): SpeechSynthesisUtterance {
  return {
    text,
    lang: "",
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
    onstart: null,
    onend: null,
    onerror: null,
  } as unknown as SpeechSynthesisUtterance;
}

class MockSynthesis implements SpeechSynthesisAdapter {
  readonly spoken: SpeechSynthesisUtterance[] = [];
  readonly listeners = new Set<EventListener>();
  cancelCount = 0;
  pauseCount = 0;
  resumeCount = 0;

  constructor(public voices: SpeechSynthesisVoice[] = []) {}

  cancel() {
    this.cancelCount += 1;
  }

  getVoices() {
    return this.voices;
  }

  pause() {
    this.pauseCount += 1;
  }

  resume() {
    this.resumeCount += 1;
  }

  speak(value: SpeechSynthesisUtterance) {
    this.spoken.push(value);
  }

  addEventListener(_type: "voiceschanged", listener: EventListener) {
    this.listeners.add(listener);
  }

  removeEventListener(
    _type: "voiceschanged",
    listener: EventListener,
  ) {
    this.listeners.delete(listener);
  }

  emitVoicesChanged() {
    this.listeners.forEach((listener) =>
      listener(new Event("voiceschanged")),
    );
  }
}

afterEach(() => {
  resetGuidedDemoState();
});

test("speech synthesis support detection requires both browser APIs", () => {
  assert.equal(hasSpeechSynthesisSupport(undefined), false);
  assert.equal(
    hasSpeechSynthesisSupport({ speechSynthesis: {} }),
    false,
  );
  assert.equal(
    hasSpeechSynthesisSupport({
      speechSynthesis: {},
      SpeechSynthesisUtterance: function MockUtterance() {},
    }),
    true,
  );
});

test("locale voice configuration uses ko-KR and en-US presentation settings", () => {
  assert.deepEqual(getNarrationVoiceConfig("ko"), {
    lang: "ko-KR",
    rate: 0.92,
    pitch: 1.02,
    volume: 0.9,
  });
  assert.deepEqual(getNarrationVoiceConfig("en"), {
    lang: "en-US",
    rate: 0.96,
    pitch: 1,
    volume: 0.9,
  });
});

test("voice selection follows exact, language, name, and default fallbacks", () => {
  const fallback = voice("System default", "fr-FR", true);
  const namedKorean = voice("Microsoft Korean", "zz-ZZ");
  const genericKorean = voice("Korean generic", "ko");
  const exactKorean = voice("Korean exact", "ko-KR");
  const genericEnglish = voice("English generic", "en-GB");
  const exactEnglish = voice("English exact", "en-US");

  assert.equal(
    selectNarrationVoice(
      [fallback, namedKorean, genericKorean, exactKorean],
      "ko",
    ),
    exactKorean,
  );
  assert.equal(
    selectNarrationVoice([fallback, namedKorean], "ko"),
    namedKorean,
  );
  assert.equal(
    selectNarrationVoice(
      [fallback, genericEnglish, exactEnglish],
      "en",
    ),
    exactEnglish,
  );
  assert.equal(selectNarrationVoice([fallback], "en"), fallback);
  assert.equal(selectNarrationVoice([], "en"), null);
});

test("narration preference storage normalizes invalid values and persists on/off", () => {
  const storage = new MemoryStorage();
  assert.equal(normalizeNarrationPreference("broken"), "on");
  assert.equal(
    readNarrationPreference(
      storage,
      MOOLO_STORAGE_KEYS.guidedNarration,
    ),
    "on",
  );

  writeNarrationPreference(
    storage,
    MOOLO_STORAGE_KEYS.guidedNarration,
    "off",
  );
  assert.equal(
    readNarrationPreference(
      storage,
      MOOLO_STORAGE_KEYS.guidedNarration,
    ),
    "off",
  );
  storage.setItem(MOOLO_STORAGE_KEYS.guidedNarration, "loud");
  assert.equal(
    readNarrationPreference(
      storage,
      MOOLO_STORAGE_KEYS.guidedNarration,
    ),
    "on",
  );
});

test("all six steps provide localized intro and result narration", () => {
  assert.equal(GUIDED_DEMO_STEPS.length, 6);
  for (const step of GUIDED_DEMO_STEPS) {
    assert.ok(step.narration.ko.intro.length > 20);
    assert.ok(step.narration.ko.result.length > 20);
    assert.ok(step.narration.en.intro.length > 20);
    assert.ok(step.narration.en.result.length > 20);
  }
  assert.match(
    getGuidedDemoNarration(1, "result", "ko") ?? "",
    /Native Timer/,
  );
  assert.match(
    getGuidedDemoNarration(1, "result", "en") ?? "",
    /Native Timer/,
  );
  assert.match(
    getGuidedDemoNarration(5, "complete", "ko") ?? "",
    /가이드 데모가 완료/,
  );
});

test("Start Guided Demo can request Step 1 intro narration after activation", () => {
  const synthesis = new MockSynthesis([voice("Korean", "ko-KR")]);
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  useGuidedDemoStore.getState().startGuidedDemo();

  const text = getGuidedDemoNarration(0, "intro", "ko");
  assert.ok(text);
  assert.equal(narrator.speak(text, "ko"), true);
  assert.equal(synthesis.spoken[0].lang, "ko-KR");
  assert.match(synthesis.spoken[0].text, /정상적인 전송/);
  narrator.destroy();
});

test("Run Step result narration is independently requested for the result phase", () => {
  const synthesis = new MockSynthesis([voice("English", "en-US")]);
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  assert.equal(synthesis.spoken.length, 0);
  useGuidedDemoStore.getState().completeGuidedDemoStep();

  const result = getGuidedDemoNarration(0, "result", "en");
  assert.ok(result);
  narrator.speak(result, "en");
  assert.equal(useGuidedDemoStore.getState().phase, "result");
  assert.equal(synthesis.spoken[0].lang, "en-US");
  narrator.destroy();
});

test("Next, Previous, Exit, and Reset cancellation clears queued narration", () => {
  const synthesis = new MockSynthesis();
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  const baseline = synthesis.cancelCount;
  narrator.cancel();
  narrator.cancel();
  narrator.cancel();
  narrator.cancel();
  assert.equal(synthesis.cancelCount, baseline + 4);
  narrator.destroy();
});

test("Replay uses the current phase text, enforces cooldown, and never overlaps", () => {
  const synthesis = new MockSynthesis();
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  const intro = getGuidedDemoNarration(0, "intro", "en") ?? "";
  const result = getGuidedDemoNarration(0, "result", "en") ?? "";

  assert.equal(narrator.replay(intro, "en", 1_000), true);
  assert.equal(narrator.replay(result, "en", 1_200), false);
  assert.equal(narrator.replay(result, "en", 1_500), true);
  assert.match(
    synthesis.spoken[synthesis.spoken.length - 1].text,
    /evaluated/,
  );
  assert.ok(synthesis.cancelCount >= 2);
  narrator.destroy();
});

test("pause and resume update status without changing Guided Demo state", () => {
  const synthesis = new MockSynthesis();
  const statuses: NarrationStatus[] = [];
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
    onStatusChange: (status) => statuses.push(status),
  });
  useGuidedDemoStore.getState().startGuidedDemo();
  const before = useGuidedDemoStore.getState().currentStepIndex;
  narrator.pause();
  narrator.resume();

  assert.equal(synthesis.pauseCount, 1);
  assert.equal(synthesis.resumeCount, 1);
  assert.deepEqual(statuses.slice(-2), ["paused", "speaking"]);
  assert.equal(useGuidedDemoStore.getState().currentStepIndex, before);
  narrator.destroy();
});

test("locale cancellation preserves current Guided Demo step and phase", () => {
  const synthesis = new MockSynthesis();
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  useGuidedDemoStore.getState().completeGuidedDemoStep();
  const before = useGuidedDemoStore.getState();

  narrator.cancel();
  const after = useGuidedDemoStore.getState();
  assert.equal(after.currentStepIndex, before.currentStepIndex);
  assert.equal(after.phase, before.phase);
  narrator.destroy();
});

test("sound and narration preferences remain independent", () => {
  const storage = new MemoryStorage();
  storage.setItem(MOOLO_STORAGE_KEYS.soundPreference, "false");
  storage.setItem(MOOLO_STORAGE_KEYS.guidedNarration, "on");
  assert.equal(storage.getItem(MOOLO_STORAGE_KEYS.soundPreference), "false");
  assert.equal(
    readNarrationPreference(
      storage,
      MOOLO_STORAGE_KEYS.guidedNarration,
    ),
    "on",
  );
});

test("unsupported speech leaves the Guided Demo usable", () => {
  assert.equal(hasSpeechSynthesisSupport({}), false);
  useGuidedDemoStore.getState().startGuidedDemo();
  useGuidedDemoStore.getState().runGuidedDemoStep();
  assert.equal(useGuidedDemoStore.getState().phase, "running");
  assert.equal(
    useGuidedDemoStore.getState().completeGuidedDemoStep(),
    true,
  );
  assert.equal(useGuidedDemoStore.getState().phase, "result");
});

test("utterance errors do not interrupt Guided Demo progress", () => {
  const synthesis = new MockSynthesis();
  const statuses: NarrationStatus[] = [];
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
    onStatusChange: (status) => statuses.push(status),
  });
  useGuidedDemoStore.getState().startGuidedDemo();
  narrator.speak("A safe local sentence.", "en");
  synthesis.spoken[0].onerror?.({
    error: "synthesis-failed",
  } as SpeechSynthesisErrorEvent);

  assert.equal(statuses.at(-1), "error");
  assert.equal(useGuidedDemoStore.getState().phase, "intro");
  assert.equal(useGuidedDemoStore.getState().runGuidedDemoStep(), true);
  narrator.destroy();
});

test("sentence chunks play sequentially and cancel invalidates the queue", () => {
  const synthesis = new MockSynthesis();
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  assert.deepEqual(splitNarrationText("One. Two!"), ["One.", "Two!"]);
  narrator.speak("One. Two!", "en");
  assert.equal(synthesis.spoken.length, 1);
  synthesis.spoken[0].onend?.({} as SpeechSynthesisEvent);
  assert.equal(synthesis.spoken.length, 2);
  narrator.cancel();
  synthesis.spoken[1].onend?.({} as SpeechSynthesisEvent);
  assert.equal(synthesis.spoken.length, 2);
  narrator.destroy();
});

test("voiceschanged reloads voices and destroy removes listener and cancels", () => {
  const synthesis = new MockSynthesis();
  const narrator = new GuidedDemoNarrator({
    synthesis,
    createUtterance: utterance,
  });
  assert.equal(synthesis.listeners.size, 1);
  synthesis.voices = [voice("Korean", "ko-KR")];
  synthesis.emitVoicesChanged();
  narrator.speak("안전한 데모입니다.", "ko");
  assert.equal(synthesis.spoken[0].voice?.lang, "ko-KR");

  const beforeDestroy = synthesis.cancelCount;
  narrator.destroy();
  assert.equal(synthesis.listeners.size, 0);
  assert.equal(synthesis.cancelCount, beforeDestroy + 1);
});
