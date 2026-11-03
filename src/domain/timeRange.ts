// Faixas de horário dos gatilhos (spec 02 v0.2, seções 4.2 e 4.3; doc 01,
// seção 4.2).
//
// No banco uma faixa é `HH:MM-HH:MM` (`triggers.value` com `kind = 'time'`).
// Fim menor que o início atravessa a meia-noite; fim 00:00 é a própria
// meia-noite (22:00-00:00 cobre as duas últimas horas do dia). Início e fim
// nunca são iguais.

export type TimeRange = {
  /** Minutos desde a meia-noite, de 0 a 1439. */
  readonly start: number;
  /** Minutos desde a meia-noite, de 0 a 1439, diferente de `start`. */
  readonly end: number;
};

export const MINUTES_PER_DAY = 24 * 60;

const TIME_RANGE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;

/** As 12 faixas fixas de 2 horas que cobrem o dia: 00:00-02:00 … 22:00-00:00. */
export const PRESET_TIME_RANGES: readonly TimeRange[] = Array.from({ length: 12 }, (_, index) => ({
  start: index * 120,
  end: ((index + 1) * 120) % MINUTES_PER_DAY,
}));

function isMinuteOfDay(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 0 && minutes < MINUTES_PER_DAY;
}

export function isValidTimeRange(range: TimeRange): boolean {
  return isMinuteOfDay(range.start) && isMinuteOfDay(range.end) && range.start !== range.end;
}

/** Lê `HH:MM-HH:MM`; null se o formato ou a faixa forem inválidos. */
export function parseTimeRange(value: string): TimeRange | null {
  const match = TIME_RANGE_PATTERN.exec(value);
  if (!match) return null;
  const range = {
    start: Number(match[1]) * 60 + Number(match[2]),
    end: Number(match[3]) * 60 + Number(match[4]),
  };
  return isValidTimeRange(range) ? range : null;
}

/** `HH:MM` de um minuto do dia. */
export function formatMinutes(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Formato do banco: `HH:MM-HH:MM`. */
export function formatTimeRange(range: TimeRange): string {
  if (!isValidTimeRange(range)) throw new RangeError('Faixa de horário inválida');
  return `${formatMinutes(range.start)}-${formatMinutes(range.end)}`;
}

export function crossesMidnight(range: TimeRange): boolean {
  return range.end < range.start;
}

/** O horário local de `date` está na faixa? Início incluso, fim excluso. */
export function isWithinTimeRange(range: TimeRange, date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return crossesMidnight(range)
    ? minutes >= range.start || minutes < range.end
    : minutes >= range.start && minutes < range.end;
}

export function isSameTimeRange(a: TimeRange, b: TimeRange): boolean {
  return a.start === b.start && a.end === b.end;
}

export function isPresetTimeRange(range: TimeRange): boolean {
  return PRESET_TIME_RANGES.some((preset) => isSameTimeRange(preset, range));
}

/**
 * Acrescenta uma faixa à seleção sem duplicar: uma faixa personalizada igual a
 * uma fixa (ou a outra já escolhida) não entra de novo.
 */
export function addTimeRange(selected: readonly TimeRange[], range: TimeRange): TimeRange[] {
  if (!isValidTimeRange(range)) throw new RangeError('Faixa de horário inválida');
  return selected.some((item) => isSameTimeRange(item, range))
    ? [...selected]
    : [...selected, range];
}

/** Resultado de `mergeTimeRanges` quando as faixas cobrem as 24 horas. */
export const ALL_DAY = 'all_day';

/** Intervalo dentro de um dia só: `end` vai até 1440 e é sempre maior que `start`. */
type Span = { start: number; end: number };

function toSpans(range: TimeRange): Span[] {
  const end = range.end === 0 ? MINUTES_PER_DAY : range.end;
  return crossesMidnight(range) && range.end !== 0
    ? [
        { start: range.start, end: MINUTES_PER_DAY },
        { start: 0, end: range.end },
      ]
    : [{ start: range.start, end }];
}

/**
 * Faixas para mostrar no resumo: as vizinhas e as sobrepostas viram um
 * intervalo só, inclusive através da meia-noite (20:00-22:00, 22:00-00:00 e
 * 23:30-01:00 viram 20:00-01:00). Ordenadas pelo início. O banco continua com
 * as faixas como foram marcadas.
 */
export function mergeTimeRanges(ranges: readonly TimeRange[]): TimeRange[] | typeof ALL_DAY {
  const spans = ranges
    .filter(isValidTimeRange)
    .flatMap(toSpans)
    .sort((a, b) => a.start - b.start);
  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged.at(-1);
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  const first = merged[0];
  const last = merged.at(-1);
  if (first && last && first.start === 0 && last.end === MINUTES_PER_DAY) {
    if (merged.length === 1) return ALL_DAY;
    // Junta o pedaço do fim do dia com o do começo: uma faixa que atravessa a meia-noite.
    merged.pop();
    merged[0] = { start: last.start, end: first.end };
  }
  return merged
    .map((span) => ({ start: span.start, end: span.end % MINUTES_PER_DAY }))
    .sort((a, b) => a.start - b.start);
}
