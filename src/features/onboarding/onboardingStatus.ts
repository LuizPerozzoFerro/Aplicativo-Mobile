import { useSyncExternalStore } from 'react';

// Estado "onboarding concluído", que decide entre o onboarding e as abas
// (spec 01, seção 4.4). No passo 6 ele vive em memória; no passo 7 passa a ser
// lido e gravado em settings.onboarding_completed, atrás desta mesma interface.

export type OnboardingStatusStore = {
  isCompleted(): boolean;
  setCompleted(completed: boolean): void;
  subscribe(listener: () => void): () => void;
};

export function createMemoryOnboardingStatus(initial = false): OnboardingStatusStore {
  let completed = initial;
  const listeners = new Set<() => void>();
  return {
    isCompleted: () => completed,
    setCompleted(next) {
      if (next === completed) return;
      completed = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const onboardingStatus: OnboardingStatusStore = createMemoryOnboardingStatus();

/** Valor atual, com nova renderização quando muda. */
export function useOnboardingCompleted(store: OnboardingStatusStore = onboardingStatus): boolean {
  return useSyncExternalStore(store.subscribe, store.isCompleted);
}
