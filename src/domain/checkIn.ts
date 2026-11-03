// Check-in diário e recaída da abstinência (spec 02 v0.2, seção 4.3; doc 01,
// seção 6.2).
//
// - Um check-in por dia, oferecido o dia todo nesta fase; o horário escolhido
//   só passa a valer na Fase 4, com a notificação.
// - Dia sem resposta não muda a streak.
// - Recaída para hoje ou ontem; "ontem" só dentro do período acompanhado.
// - Desfaz-se tudo o que foi registrado hoje, até o fim do dia.

import { addCalendarDays, calendarDaysBetween, isSameDay, startOfDay, toDayKey } from './day';

export const CHECK_IN_ANSWERS = ['no_relapse', 'relapse'] as const;
export type CheckInAnswer = (typeof CHECK_IN_ANSWERS)[number];

export const CHECK_IN_SOURCES = ['app', 'notification'] as const;
export type CheckInSource = (typeof CHECK_IN_SOURCES)[number];

/** Horário padrão do check-in: 21h, em minutos desde a meia-noite. */
export const DEFAULT_CHECK_IN_MINUTES = 21 * 60;

const MINUTES_PER_DAY = 24 * 60;

export function isValidCheckInMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < MINUTES_PER_DAY;
}

export type CheckInRecord = {
  readonly dayKey: string;
  readonly answer: CheckInAnswer;
};

export type CheckInStatus =
  { readonly state: 'pending' } | { readonly state: 'answered'; readonly answer: CheckInAnswer };

/** Estado do check-in de hoje a partir dos check-ins gravados. */
export function getTodayCheckInStatus(
  checkIns: readonly CheckInRecord[],
  now: Date,
): CheckInStatus {
  const todayKey = toDayKey(now);
  const today = checkIns.find((checkIn) => checkIn.dayKey === todayKey);
  return today ? { state: 'answered', answer: today.answer } : { state: 'pending' };
}

export const RELAPSE_DAYS = ['today', 'yesterday'] as const;
export type RelapseDay = (typeof RELAPSE_DAYS)[number];

/**
 * Dias que "Registrar recaída" oferece. "Ontem" só quando ontem já está no
 * período acompanhado, ou seja, quando o início é anterior a hoje.
 */
export function getRelapseDayOptions(startedAt: Date, now: Date): readonly RelapseDay[] {
  return calendarDaysBetween(startedAt, now) >= 1 ? RELAPSE_DAYS : ['today'];
}

/** Chave AAAA-MM-DD do dia escolhido para a recaída. */
export function getRelapseDayKey(day: RelapseDay, now: Date): string {
  return toDayKey(day === 'today' ? startOfDay(now) : addCalendarDays(now, -1));
}

/**
 * Um registro (check-in ou recaída) pode ser desfeito se foi feito hoje,
 * qualquer que seja o dia a que ele se refere.
 */
export function canUndo(recordedAt: Date, now: Date): boolean {
  return isSameDay(recordedAt, now);
}
