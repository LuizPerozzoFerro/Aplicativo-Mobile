// Ponto de partida e tempo recuperado da moderação (spec 04, 5.7). Regras
// puras: recebem os dias com histórico e os minutos de cada dia (já sem o tempo
// diante da tela de interrupção) e dizem o que guardar e o que mostrar.

import { addCalendarDays, fromDayKey, toDayKey } from './day';

export const BASELINE_SOURCES = ['before_start', 'first_week'] as const;
export type BaselineSource = (typeof BASELINE_SOURCES)[number];

/** Dias antes do início que o ponto de partida olha, e quantos com dados bastam. */
export const BASELINE_BEFORE_DAYS = 7;
export const BASELINE_MIN_BEFORE_DAYS = 3;
/** Dias completos da janela `first_week`. */
export const BASELINE_FIRST_WEEK_DAYS = 7;

export type DailyUsage = {
  /** Dias com histórico (dados do dia inteiro), mesmo com uso zero. */
  readonly coveredDayKeys: ReadonlySet<string>;
  /** Minutos de uso no dia (apps da compulsão); 0 se não houver linhas. */
  readonly minutesOn: (dayKey: string) => number;
};

export type BaselineInput = DailyUsage & {
  /** Dia do início da moderação (AAAA-MM-DD). */
  readonly startDayKey: string;
  /**
   * Dia da primeira importação do histórico (a instalação da Fase 5). Quem
   * começou antes dele usa a primeira semana depois dele.
   */
  readonly historySinceDayKey: string;
  readonly todayKey: string;
};

export type BaselineResult =
  | { readonly status: 'ready'; readonly minutesPerDay: number; readonly source: BaselineSource }
  /** Ainda não dá para calcular: mostrar "Disponível a partir de <dia>". */
  | { readonly status: 'pending'; readonly availableFromDayKey: string };

const shift = (dayKey: string, days: number): string => {
  const day = fromDayKey(dayKey);
  if (day === null) throw new RangeError('Dia inválido');
  return toDayKey(addCalendarDays(day, days));
};

const average = (values: readonly number[]) =>
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

/**
 * Ponto de partida (5.7):
 * - com pelo menos 3 dias com dados entre os 7 antes do início, a média deles
 *   (`before_start`);
 * - senão, a média dos 7 primeiros dias completos com dados depois do início
 *   (o dia do início não é completo) ou, para quem começou antes da Fase 5,
 *   depois do dia da instalação (`first_week`). Dia sem dados (sem o acesso ao
 *   uso) é pulado. Antes de juntar os 7, fica pendente, com o dia a partir do
 *   qual deve aparecer se não faltar mais nenhum.
 */
export function computeBaseline(input: BaselineInput): BaselineResult {
  const { startDayKey, historySinceDayKey, todayKey, coveredDayKeys, minutesOn } = input;

  const before: number[] = [];
  for (let offset = BASELINE_BEFORE_DAYS; offset >= 1; offset -= 1) {
    const day = shift(startDayKey, -offset);
    if (coveredDayKeys.has(day)) before.push(minutesOn(day));
  }
  if (before.length >= BASELINE_MIN_BEFORE_DAYS) {
    return { status: 'ready', minutesPerDay: average(before), source: 'before_start' };
  }

  // A janela começa no dia seguinte ao início, ou ao da instalação para quem começou antes.
  const anchor = startDayKey < historySinceDayKey ? historySinceDayKey : startDayKey;
  const window: number[] = [];
  let day = shift(anchor, 1);
  while (day < todayKey && window.length < BASELINE_FIRST_WEEK_DAYS) {
    if (coveredDayKeys.has(day)) window.push(minutesOn(day));
    day = shift(day, 1);
  }
  if (window.length === BASELINE_FIRST_WEEK_DAYS) {
    return { status: 'ready', minutesPerDay: average(window), source: 'first_week' };
  }
  // O dia seguinte ao último que falta, contando de hoje (ou do começo da janela).
  const first = shift(anchor, 1);
  const from = todayKey > first ? todayKey : first;
  return {
    status: 'pending',
    availableFromDayKey: shift(from, BASELINE_FIRST_WEEK_DAYS - window.length),
  };
}

export type RecoveredInput = DailyUsage & {
  readonly baselineMinutesPerDay: number;
  readonly startDayKey: string;
  readonly todayKey: string;
};

export type Recovered = {
  /** Minutos abaixo do ponto de partida, somados desde o início. */
  readonly totalMinutes: number;
  /** O mesmo, só nos últimos 7 dias completos. */
  readonly weekMinutes: number;
};

/**
 * Tempo recuperado (5.7): soma de quanto cada dia completo com histórico, desde
 * o dia seguinte ao início, ficou abaixo do ponto de partida. Dias acima não
 * descontam; dias sem histórico e o dia de hoje (ainda em andamento) não entram.
 */
export function computeRecovered(input: RecoveredInput): Recovered {
  const { baselineMinutesPerDay, startDayKey, todayKey, coveredDayKeys, minutesOn } = input;
  const weekStart = shift(todayKey, -7);
  let totalMinutes = 0;
  let weekMinutes = 0;
  for (const day of [...coveredDayKeys].sort()) {
    if (day <= startDayKey || day >= todayKey) continue;
    const saved = Math.max(0, baselineMinutesPerDay - minutesOn(day));
    totalMinutes += saved;
    if (day >= weekStart) weekMinutes += saved;
  }
  return { totalMinutes, weekMinutes };
}
