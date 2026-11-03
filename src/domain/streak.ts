// Streak e marcos (spec 02, seção 4.3; doc 01, seções 6.2 e 6.3).
//
// A streak conta dias de calendário a partir de uma base: no próprio dia da
// base ela é 0. Os eventos (recaídas e dias reprovados) chegam como chaves
// AAAA-MM-DD, como ficam no banco; o início chega como o instante gravado em
// `user_compulsions.started_at`.

import type { Mechanic } from './compulsion';
import { addCalendarDays, calendarDaysBetween, fromDayKey, startOfDay } from './day';

/**
 * Marcos provisórios, em dias (doc 01, 6.3). Único lugar da lista: o conteúdo
 * remoto da Fase 5 substitui.
 */
export const MILESTONE_DAYS = [1, 3, 7, 14, 30, 60, 90, 180, 365] as const;

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
 * Dia a partir do qual a streak conta.
 * - Abstinência: o mais recente entre o início e o dia da última recaída.
 * - Moderação: o mais recente entre o início e o dia seguinte ao último dia
 *   reprovado. Com hoje reprovado, a base é amanhã e a streak fica em 0.
 */
export function getStreakBase(mechanic: Mechanic, input: StreakInput): Date {
  const start = startOfDay(input.startedAt);
  const lastEvent = latest(pastEventDays(input.eventDayKeys, input.now));
  if (lastEvent === null) return start;
  const fromEvent = mechanic === 'abstinence' ? lastEvent : addCalendarDays(lastEvent, 1);
  return fromEvent.getTime() > start.getTime() ? fromEvent : start;
}

/** Streak em dias de calendário. Nunca negativa (início no futuro ou hoje reprovado dão 0). */
export function getStreakDays(mechanic: Mechanic, input: StreakInput): number {
  return Math.max(0, calendarDaysBetween(getStreakBase(mechanic, input), input.now));
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
