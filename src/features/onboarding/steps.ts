import { ONBOARDING_STEPS, type OnboardingStep } from '@/domain/onboarding';

// Ordem do onboarding (doc 01, seção 4.2). A lista vive no domínio
// (src/domain/onboarding.ts), que também alimenta o CHECK de
// settings.onboarding_step; as rotas ficam em app/(onboarding)/ com estes nomes.
export {
  ONBOARDING_STEPS,
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  type OnboardingStep,
} from '@/domain/onboarding';

export function isFirstStep(step: OnboardingStep): boolean {
  return ONBOARDING_STEPS.indexOf(step) === 0;
}
