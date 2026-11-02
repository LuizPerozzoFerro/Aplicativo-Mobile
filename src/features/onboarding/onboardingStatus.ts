import { useSyncExternalStore } from 'react';

// Estado "onboarding concluído", que decide entre o onboarding e as abas
// (spec 01, seção 4.4). Começa em memória; depois das migrações, o app o
// conecta ao banco (settings.onboarding_completed) com connect().

export type OnboardingStorage = {
  load(): boolean;
  save(completed: boolean): void;
};

export type OnboardingStatusStore = {
  isCompleted(): boolean;
  setCompleted(completed: boolean): void;
  subscribe(listener: () => void): () => void;
  /** Passa a ler e gravar no armazenamento dado (o banco, no app). */
  connect(storage: OnboardingStorage): void;
};

export function createOnboardingStatus(initial = false): OnboardingStatusStore {
  let completed = initial;
  let storage: OnboardingStorage | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    isCompleted: () => completed,
    setCompleted(next) {
      if (next === completed) return;
      // Grava antes de mudar a tela: se o banco falhar, a navegação não muda.
      storage?.save(next);
      completed = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    connect(nextStorage) {
      storage = nextStorage;
      const loaded = nextStorage.load();
      if (loaded !== completed) {
        completed = loaded;
        notify();
      }
    },
  };
}

export const onboardingStatus: OnboardingStatusStore = createOnboardingStatus();

/** Valor atual, com nova renderização quando muda. */
export function useOnboardingCompleted(store: OnboardingStatusStore = onboardingStatus): boolean {
  return useSyncExternalStore(store.subscribe, store.isCompleted);
}
