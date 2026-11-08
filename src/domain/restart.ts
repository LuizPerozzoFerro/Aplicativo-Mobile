// Notificação de recomeço (spec 03, seção 5.4): no dia seguinte a uma quebra
// (recaída registrada ou dia reprovado), só se a streak era de 1 dia ou mais.
// Recaída registrada hoje para ontem não gera recomeço: o usuário acabou de
// ver a mensagem de apoio no app.

import { addCalendarDays, fromDayKey, toDayKey } from './day';
import { getStreakDays } from './streak';

export type RestartBreak = {
  /** Dia da quebra (AAAA-MM-DD). */
  readonly dayKey: string;
  /** Dia em que foi registrada. */
  readonly recordedOnDayKey: string;
};

export type RestartInput = {
  readonly startedAt: Date;
  readonly breaks: readonly RestartBreak[];
};

/**
 * Dias com recomeço pendente: hoje (quebra de ontem) e amanhã (quebra de hoje),
 * sem repetir. Quebra nas duas compulsões no mesmo dia gera um dia só. Como a
 * lista sai das quebras que existem no banco, desfazer a quebra cancela o recomeço.
 */
export function getRestartDayKeys(inputs: readonly RestartInput[], now: Date): string[] {
  const today = toDayKey(now);
  const yesterday = toDayKey(addCalendarDays(now, -1));
  const days = new Set<string>();

  for (const { startedAt, breaks } of inputs) {
    for (const { dayKey, recordedOnDayKey } of breaks) {
      if (dayKey !== today && dayKey !== yesterday) continue;
      if (recordedOnDayKey !== dayKey) continue;
      const day = fromDayKey(dayKey);
      if (day === null) continue;
      // A streak até a véspera da quebra: as quebras anteriores contam, esta não.
      const eventDayKeys = breaks.filter((item) => item.dayKey < dayKey).map((item) => item.dayKey);
      if (getStreakDays({ startedAt, eventDayKeys, now: day }) < 1) continue;
      days.add(toDayKey(addCalendarDays(day, 1)));
    }
  }
  return [...days].sort();
}
