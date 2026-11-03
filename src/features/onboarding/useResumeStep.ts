import { onboardingProgress, type OnboardingProgressStore } from './onboardingProgress';
import { ONBOARDING_STEPS, type OnboardingStep } from './steps';

/**
 * Etapa para onde as boas-vindas devem redirecionar ao abrir o app (spec 02,
 * seção 4.4; R3), ou null. Só lê: a retomada é marcada como feita quando
 * qualquer etapa aparece (OnboardingStepScreen), então voltar às boas-vindas
 * depois não pula de novo para frente.
 */
export function useResumeStep(
  store: OnboardingProgressStore = onboardingProgress,
): OnboardingStep | null {
  const saved = store.getResumeStep();
  return saved && saved !== ONBOARDING_STEPS[0] ? saved : null;
}
