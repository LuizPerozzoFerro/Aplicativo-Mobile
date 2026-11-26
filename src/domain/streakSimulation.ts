// Ferramenta de teste "Simular uma streak" (spec 04, 5.12), só em
// desenvolvimento. Regras puras: o que muda para a streak de uma compulsão
// ficar em N dias, e o formato do registro que permite desfazer.
//
// A streak conta da base, que é o mais recente entre o início e a última
// quebra (streak.ts). Para dar N dias, o início vai para hoje - N e as quebras
// desse dia em diante saem enquanto a simulação durar. Na abstinência, os
// "dias sem recair" do início viram 0, senão os marcos até eles entrariam sem
// celebração (milestones.ts).

import { addCalendarDays, fromDayKey, startOfDay, toDayKey } from './day';

/** Streaks que a ferramenta oferece: marcos e vizinhos de marcos. */
export const SIMULATION_DAY_OPTIONS = [1, 3, 6, 7, 14, 30] as const;
export const MAX_SIMULATION_DAYS = 365;

export function isValidSimulationDays(days: number): boolean {
  return Number.isInteger(days) && days >= 0 && days <= MAX_SIMULATION_DAYS;
}

export type SimulationPlan = {
  /** Novo início: o primeiro instante do dia hoje - N. */
  readonly startedAt: Date;
  /** Quebras deste dia (AAAA-MM-DD) em diante saem durante a simulação. */
  readonly breaksFromDayKey: string;
};

export function planStreakSimulation(days: number, now: Date): SimulationPlan {
  if (!isValidSimulationDays(days)) throw new RangeError('Dias da simulação inválidos');
  const startedAt = addCalendarDays(startOfDay(now), -days);
  return { startedAt, breaksFromDayKey: toDayKey(startedAt) };
}

/** Uma recaída tirada durante a simulação, com o check-in do mesmo dia. */
export type SavedRelapse = {
  readonly dayKey: string;
  readonly recordedAt: number;
  readonly checkIn: {
    readonly answer: string;
    readonly source: string;
    readonly answeredAt: number;
    readonly previousAnswer: string | null;
    readonly previousSource: string | null;
    readonly previousAnsweredAt: number | null;
  } | null;
};

/** Um dia reprovado da moderação que deixou de ser reprovado durante a simulação. */
export type SavedFailedDay = { readonly dayKey: string; readonly reason: string };

/**
 * O que a simulação mudou, para "Desfazer a simulação" voltar tudo. Guardado
 * fora do banco do app, em JSON. Instantes em milissegundos.
 */
export type SimulationSnapshot = {
  readonly version: 1;
  readonly compulsionId: number;
  readonly days: number;
  readonly simulatedAt: number;
  readonly startedAt: number;
  readonly initialStreakDays: number | null;
  readonly baselineMinutesPerDay: number | null;
  readonly baselineSource: string | null;
  readonly relapses: readonly SavedRelapse[];
  readonly failedDays: readonly SavedFailedDay[];
  /** Maior id de alcance de marco antes da simulação: os maiores são dela. */
  readonly maxReachId: number;
};

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isNullableNumber = (value: unknown) => value === null || isNumber(value);
const isNullableString = (value: unknown) => value === null || typeof value === 'string';
const isDayKey = (value: unknown) => typeof value === 'string' && fromDayKey(value) !== null;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isSavedRelapse(value: unknown): value is SavedRelapse {
  if (!isObject(value) || !isDayKey(value.dayKey) || !isNumber(value.recordedAt)) return false;
  const checkIn = value.checkIn;
  if (checkIn === null) return true;
  return (
    isObject(checkIn) &&
    typeof checkIn.answer === 'string' &&
    typeof checkIn.source === 'string' &&
    isNumber(checkIn.answeredAt) &&
    isNullableString(checkIn.previousAnswer) &&
    isNullableString(checkIn.previousSource) &&
    isNullableNumber(checkIn.previousAnsweredAt)
  );
}

function isSavedFailedDay(value: unknown): value is SavedFailedDay {
  return isObject(value) && isDayKey(value.dayKey) && typeof value.reason === 'string';
}

/** Lê o registro guardado; null se faltar ou vier em outro formato. */
export function parseSimulationSnapshot(json: string | null): SimulationSnapshot | null {
  if (json === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !isNumber(value.compulsionId) ||
    !isNumber(value.days) ||
    !isNumber(value.simulatedAt) ||
    !isNumber(value.startedAt) ||
    !isNullableNumber(value.initialStreakDays) ||
    !isNullableNumber(value.baselineMinutesPerDay) ||
    !isNullableString(value.baselineSource) ||
    !Array.isArray(value.relapses) ||
    !value.relapses.every(isSavedRelapse) ||
    !Array.isArray(value.failedDays) ||
    !value.failedDays.every(isSavedFailedDay) ||
    !isNumber(value.maxReachId)
  ) {
    return null;
  }
  return value as SimulationSnapshot;
}
