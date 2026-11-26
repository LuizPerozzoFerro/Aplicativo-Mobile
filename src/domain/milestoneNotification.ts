// "Hoje é dia de marco?" para a notificação de marco do nativo (spec 04, 4.3 e
// 5.5). O nativo decide com o app fechado; estas regras são as mesmas do
// Kotlin (MilestoneRules.kt) e rodam contra os mesmos vetores
// (vectors/milestone-day.json) no Jest e no JUnit.

import { addCalendarDays, calendarDaysBetween, fromDayKey, toDayKey } from './day';

export type MilestoneDayCompulsion = {
  readonly id: number;
  /** Base da streak segundo o JS (AAAA-MM-DD): o início ou o dia da última quebra. */
  readonly streakBaseDayKey: string;
  /** A base do JS é um dia de quebra (recomeço), não um início limpo. */
  readonly streakBaseIsBreak: boolean;
  /** Dias dos marcos da compulsão, do catálogo. */
  readonly milestoneDays: readonly number[];
  /**
   * Até este dia (inclusive), nada de notificação de marco: o dia em que o
   * usuário começou no app, no início com "há N dias" (5.3). Nulo sem ele.
   */
  readonly quietUntilDayKey: string | null;
  /** Último dia com um alcance já celebrado no app: hoje, a notificação seria repetida. */
  readonly celebratedOnDayKey: string | null;
};

export type NativeBreak = {
  readonly compulsionId: number;
  /** Dia da quebra vista pelo nativo e ainda não importada pelo JS. */
  readonly dayKey: string;
};

export type MilestoneDayInput = {
  /** Hoje (AAAA-MM-DD), pela borda do dia do aparelho. */
  readonly today: string;
  readonly compulsions: readonly MilestoneDayCompulsion[];
  readonly nativeBreaks: readonly NativeBreak[];
};

export type MilestoneDayResult = {
  /** Dia de recomeço de alguma compulsão: nenhuma notificação de marco no aparelho. */
  readonly restartDay: boolean;
  /** Compulsões com marco hoje (antes da regra do recomeço). */
  readonly compulsionIds: readonly number[];
  /** Sai a notificação de marco hoje (uma só, mesmo com várias compulsões). */
  readonly due: boolean;
};

/**
 * A base que vale: a mais recente entre a do JS e a última quebra que o nativo
 * viu (dia reprovado na tela, "Tive uma recaída" na notificação), porque essas
 * quebras acontecem com o app fechado (4.3).
 */
export function getEffectiveBase(
  compulsion: MilestoneDayCompulsion,
  nativeBreaks: readonly NativeBreak[],
): { readonly dayKey: string; readonly isBreak: boolean } {
  const seen = nativeBreaks
    .filter((item) => item.compulsionId === compulsion.id && fromDayKey(item.dayKey) !== null)
    .map((item) => item.dayKey)
    .sort()
    .at(-1);
  // Chaves AAAA-MM-DD comparam como datas.
  if (seen !== undefined && seen >= compulsion.streakBaseDayKey) {
    return { dayKey: seen, isBreak: true };
  }
  return { dayKey: compulsion.streakBaseDayKey, isBreak: compulsion.streakBaseIsBreak };
}

export function getMilestoneDay(input: MilestoneDayInput): MilestoneDayResult {
  const today = fromDayKey(input.today);
  if (today === null) return { restartDay: false, compulsionIds: [], due: false };
  const yesterday = toDayKey(addCalendarDays(today, -1));

  let restartDay = false;
  const compulsionIds: number[] = [];
  for (const compulsion of input.compulsions) {
    const base = getEffectiveBase(compulsion, input.nativeBreaks);
    const baseDay = fromDayKey(base.dayKey);
    if (baseDay === null) continue;
    // O dia seguinte a uma quebra é o dia do recomeço, para o aparelho inteiro
    // (5.5); inclui a recaída registrada hoje para ontem (5.3).
    if (base.isBreak && base.dayKey === yesterday) restartDay = true;

    const streak = calendarDaysBetween(baseDay, today);
    if (streak < 1 || !compulsion.milestoneDays.includes(streak)) continue;
    if (compulsion.quietUntilDayKey !== null && input.today <= compulsion.quietUntilDayKey)
      continue;
    if (compulsion.celebratedOnDayKey === input.today) continue;
    compulsionIds.push(compulsion.id);
  }
  return { restartDay, compulsionIds, due: !restartDay && compulsionIds.length > 0 };
}
