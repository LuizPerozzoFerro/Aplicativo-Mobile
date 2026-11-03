import { isValidDaysAlreadyWithoutRelapse } from './streak';

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

// Validação das etapas 2 e 3 (spec 02, seção 4.4). Devolvem o primeiro
// problema, para a tela mostrar o motivo de o "Continuar" estar desabilitado.

export type CompulsionChoiceProblem = 'none_selected';

export function getCompulsionChoiceProblem(selectedCount: number): CompulsionChoiceProblem | null {
  return selectedCount > 0 ? null : 'none_selected';
}

export type ShortVideoSetupProblem = 'no_apps' | 'invalid_limit';

/** Vídeos curtos: pelo menos um app e limite inteiro de 5 a 600 minutos. */
export function getShortVideoSetupProblem(input: {
  appCount: number;
  dailyLimitMinutes: number;
}): ShortVideoSetupProblem | null {
  if (input.appCount === 0) return 'no_apps';
  if (!isValidDailyLimit(input.dailyLimitMinutes)) return 'invalid_limit';
  return null;
}

/** Como o usuário respondeu "Desde quando você está sem recair?". */
export type AbstinenceStartMode = 'today' | 'days_ago';

export type AbstinenceSetupProblem = 'invalid_days' | 'undeclared_app';

/**
 * Conteúdo adulto: "há N dias" com N de 1 a 3650; apps de risco opcionais, mas
 * cada app marcado precisa da resposta sobre consumir o conteúdo nele, sem
 * resposta pré-marcada (`null` = não respondido).
 */
export function getAbstinenceSetupProblem(input: {
  startMode: AbstinenceStartMode;
  daysAlreadyWithoutRelapse: number;
  riskAppDeclarations: readonly (boolean | null)[];
}): AbstinenceSetupProblem | null {
  if (
    input.startMode === 'days_ago' &&
    !isValidDaysAlreadyWithoutRelapse(input.daysAlreadyWithoutRelapse)
  ) {
    return 'invalid_days';
  }
  if (input.riskAppDeclarations.some((declared) => declared === null)) return 'undeclared_app';
  return null;
}

/**
 * Lê um número inteiro digitado (só dígitos, sem sinal nem vírgula). Devolve
 * NaN se o texto não for um inteiro, para a validação recusar.
 */
export function parseWholeNumber(text: string): number {
  const trimmed = text.trim();
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
