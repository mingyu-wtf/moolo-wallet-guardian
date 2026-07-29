"use client";

import { create } from "zustand";
import {
  GUIDED_DEMO_INITIAL_STATE,
  GUIDED_DEMO_STEPS,
  normalizeGuidedDemoState,
  type GuidedDemoState,
} from "@/lib/guided-demo";

interface GuidedDemoActions {
  startGuidedDemo: () => void;
  runGuidedDemoStep: () => boolean;
  completeGuidedDemoStep: () => boolean;
  nextGuidedDemoStep: () => boolean;
  previousGuidedDemoStep: () => boolean;
  finishGuidedDemo: () => boolean;
  exitGuidedDemo: () => void;
  resetGuidedDemo: () => void;
  replaceGuidedDemoState: (state: unknown) => void;
}

export type GuidedDemoStore = GuidedDemoState & GuidedDemoActions;

export const useGuidedDemoStore = create<GuidedDemoStore>()((set, get) => ({
  ...GUIDED_DEMO_INITIAL_STATE,
  startGuidedDemo: () =>
    set({
      active: true,
      currentStepIndex: 0,
      phase: "intro",
      completedSteps: [],
      startedAt: Date.now(),
    }),
  runGuidedDemoStep: () => {
    const state = get();
    if (!state.active || state.phase !== "intro") return false;
    set({ phase: "running" });
    return true;
  },
  completeGuidedDemoStep: () => {
    const state = get();
    if (!state.active || state.phase !== "running") return false;
    const step = GUIDED_DEMO_STEPS[state.currentStepIndex];
    set({
      phase: "result",
      completedSteps: state.completedSteps.includes(step.id)
        ? state.completedSteps
        : [...state.completedSteps, step.id],
    });
    return true;
  },
  nextGuidedDemoStep: () => {
    const state = get();
    if (
      !state.active ||
      state.phase !== "result" ||
      state.currentStepIndex >= GUIDED_DEMO_STEPS.length - 1
    ) {
      return false;
    }
    set({
      currentStepIndex: state.currentStepIndex + 1,
      phase: "intro",
    });
    return true;
  },
  previousGuidedDemoStep: () => {
    const state = get();
    if (
      !state.active ||
      state.phase === "running" ||
      state.phase === "complete" ||
      state.currentStepIndex <= 0
    ) {
      return false;
    }
    const nextIndex = state.currentStepIndex - 1;
    set({
      currentStepIndex: nextIndex,
      phase: "intro",
      completedSteps: state.completedSteps.filter((id) =>
        GUIDED_DEMO_STEPS.slice(0, nextIndex).some((step) => step.id === id),
      ),
    });
    return true;
  },
  finishGuidedDemo: () => {
    const state = get();
    if (
      !state.active ||
      state.phase !== "result" ||
      state.currentStepIndex !== GUIDED_DEMO_STEPS.length - 1
    ) {
      return false;
    }
    set({
      phase: "complete",
      completedSteps: GUIDED_DEMO_STEPS.map((step) => step.id),
    });
    return true;
  },
  exitGuidedDemo: () => set({ ...GUIDED_DEMO_INITIAL_STATE }),
  resetGuidedDemo: () => set({ ...GUIDED_DEMO_INITIAL_STATE }),
  replaceGuidedDemoState: (state) =>
    set(normalizeGuidedDemoState(state)),
}));

export function resetGuidedDemoState(): void {
  useGuidedDemoStore.getState().resetGuidedDemo();
}
