// Etapas e validações do onboarding (spec 02 v0.2, seção 4.4; doc 01,
// seção 4). As telas mostram os motivos; aqui ficam só as regras.

/**
 * As 7 etapas, na ordem. O valor vai para `settings.onboarding_step` e é o
 * nome da rota em app/(onboarding)/.
 */
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

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** Etapa seguinte, ou null depois da última. */
export function getNextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;
}

/** Etapa anterior, ou null na primeira. */
export function getPreviousOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) - 1] ?? null;
}

// Limite diário de vídeos curtos (um por compulsão, somado entre os apps).

export const DAILY_LIMIT_OPTIONS = [30, 45, 60, 90, 120] as const;
export const DEFAULT_DAILY_LIMIT_MINUTES = 60;
export const MIN_DAILY_LIMIT_MINUTES = 5;
export const MAX_DAILY_LIMIT_MINUTES = 600;

export function isValidDailyLimit(minutes: number): boolean {
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_DAILY_LIMIT_MINUTES &&
    minutes <= MAX_DAILY_LIMIT_MINUTES
  );
}

// Motivação ("Por que eu quero mudar?").

export const MIN_MOTIVATION_LENGTH = 3;
export const MAX_MOTIVATION_LENGTH = 280;

/**
 * Tamanho da motivação como o contador mostra: sem os espaços das pontas e
 * contando caracteres (um emoji conta 1, não 2 como em `String.length`).
 */
export function getMotivationLength(text: string): number {
  return Array.from(text.trim()).length;
}

export type MotivationProblem = 'too_short' | 'too_long';

/** Motivo de a motivação ser inválida, ou null se estiver boa. */
export function getMotivationProblem(text: string): MotivationProblem | null {
  const length = getMotivationLength(text);
  if (length < MIN_MOTIVATION_LENGTH) return 'too_short';
  if (length > MAX_MOTIVATION_LENGTH) return 'too_long';
  return null;
}
