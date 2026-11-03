// Streak e marcos (spec 02, seção 4.3; doc 01, seções 6.2 e 6.3).
//
// A streak conta dias de calendário a partir de uma base, com a mesma regra
// nas duas mecânicas: no próprio dia da base ela é 0. Os eventos (recaídas e
// dias reprovados) chegam como chaves AAAA-MM-DD, como ficam no banco; o
// início chega como o instante gravado em `user_compulsions.started_at`.

import { addCalendarDays, calendarDaysBetween, fromDayKey, startOfDay } from './day';

/**
 * Marcos provisórios, em dias (doc 01, 6.3). Único lugar da lista: o conteúdo
 * remoto da Fase 5 substitui.
 */
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

/**
 * Por que um dia da moderação foi reprovado (doc 01, 6.5.4): "Ignorar o
 * limite por hoje" ou o terceiro "Continuar mesmo assim". Gravado a partir da
 * Fase 4, em `day_states.failed_reason`.
 */
export const DAY_FAILURE_REASONS = ['ignored_limit', 'third_continue'] as const;
export type DayFailureReason = (typeof DAY_FAILURE_REASONS)[number];

/** Maior N aceito em "Estou sem recair há N dias". */
export const MAX_DAYS_ALREADY_WITHOUT_RELAPSE = 3650;

export type StreakInput = {
  /** Instante do início (`started_at`): só o dia importa. */
  readonly startedAt: Date;
  /** Abstinência: dias com recaída. Moderação: dias reprovados. */
  readonly eventDayKeys: readonly string[];
  readonly now: Date;
};

/** Dias dos eventos até hoje, como início de dia local; ignora chaves inválidas e dias futuros. */
function pastEventDays(eventDayKeys: readonly string[], now: Date): Date[] {
  const today = startOfDay(now);
  return eventDayKeys
    .map(fromDayKey)
    .filter((day): day is Date => day !== null && day.getTime() <= today.getTime());
}

function latest(days: readonly Date[]): Date | null {
  return days.reduce<Date | null>(
    (found, day) => (found === null || day.getTime() > found.getTime() ? day : found),
    null,
  );
}

/**
 * Dia a partir do qual a streak conta, igual nas duas mecânicas: o mais
 * recente entre o início e o dia do último evento (recaída na abstinência,
 * dia reprovado na moderação). No dia da quebra a streak é 0; no seguinte, 1.
 */
export function getStreakBase(input: StreakInput): Date {
  const start = startOfDay(input.startedAt);
  const lastEvent = latest(pastEventDays(input.eventDayKeys, input.now));
  return lastEvent !== null && lastEvent.getTime() > start.getTime() ? lastEvent : start;
}

/** Streak em dias de calendário. Nunca negativa (início no futuro dá 0). */
export function getStreakDays(input: StreakInput): number {
  return Math.max(0, calendarDaysBetween(getStreakBase(input), input.now));
}

/** Primeiro marco maior que a streak, ou null depois do último. */
export function getNextMilestone(streakDays: number): number | null {
  return MILESTONE_DAYS.find((days) => days > streakDays) ?? null;
}

export function isValidDaysAlreadyWithoutRelapse(days: number): boolean {
  return Number.isInteger(days) && days >= 1 && days <= MAX_DAYS_ALREADY_WITHOUT_RELAPSE;
}

/**
 * Início da abstinência a partir da resposta do onboarding, contado do dia em
 * que o usuário toca em "Começar" (spec 02 v0.2): "Estou começando hoje"
 * (`daysAlreadyWithoutRelapse` = 0) ou "Estou sem recair há N dias".
 */
export function getAbstinenceStart(startedOn: Date, daysAlreadyWithoutRelapse: number): Date {
  if (
    daysAlreadyWithoutRelapse !== 0 &&
    !isValidDaysAlreadyWithoutRelapse(daysAlreadyWithoutRelapse)
  ) {
    throw new RangeError('Número de dias sem recair fora do intervalo aceito');
  }
  return addCalendarDays(startedOn, -daysAlreadyWithoutRelapse);
}
