import type { OnboardingStep } from './steps';

// Etapa em que o onboarding parou (spec 02, seção 4.4: progresso salvo). Como
// o onboardingStatus, começa em memória e, depois das migrações, o app a
// conecta ao banco (settings.onboarding_step) com connect().

export type OnboardingProgressStorage = {
  load(): OnboardingStep | null;
  save(step: OnboardingStep | null): void;
};

export type OnboardingProgressStore = {
  /** Etapa gravada: a próxima a mostrar. Null antes de começar e depois de concluir. */
  getStep(): OnboardingStep | null;
  setStep(step: OnboardingStep | null): void;
  /**
   * Etapa onde retomar ao abrir o app, ou null se a retomada já aconteceu
   * nesta sessão (voltar às boas-vindas depois não pula de novo para frente).
   * Só lê: quem retoma chama markResumed().
   */
  getResumeStep(): OnboardingStep | null;
  markResumed(): void;
  connect(storage: OnboardingProgressStorage): void;
};

export function createOnboardingProgress(): OnboardingProgressStore {
  let step: OnboardingStep | null = null;
  let storage: OnboardingProgressStorage | null = null;
  let resumed = false;

  return {
    getStep: () => step,
    setStep(next) {
      // Grava antes de mudar: se o banco falhar, quem chamou não navega.
      storage?.save(next);
      step = next;
    },
    getResumeStep: () => (resumed ? null : step),
    markResumed() {
      resumed = true;
    },
    // Ligar ao banco acontece uma vez, na abertura do app: começa uma sessão,
    // e a etapa gravada volta a valer para a retomada.
    connect(nextStorage) {
      storage = nextStorage;
      step = nextStorage.load();
      resumed = false;
    },
  };
}

export const onboardingProgress: OnboardingProgressStore = createOnboardingProgress();
