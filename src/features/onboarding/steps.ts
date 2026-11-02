// Ordem do onboarding (doc 01, seção 4.2; spec 01, seção 4.4). As rotas ficam
// em app/(onboarding)/ com estes mesmos nomes.
export const ONBOARDING_STEPS = [
  'welcome',
  'compulsions',
  'setup',
  'triggers',
  'motivation',
  'permissions',
  'summary',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;
}

export function isFirstStep(step: OnboardingStep): boolean {
  return ONBOARDING_STEPS.indexOf(step) === 0;
}
