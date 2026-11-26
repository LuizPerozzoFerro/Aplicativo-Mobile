// Estatísticas (spec 04, 5.8; doc 01, 6.8). Regras puras: recebem o que o
// banco guarda (uso por hora, telas, avisos, quebras, check-ins, emergência) e
// dizem o que a aba mostra. Nenhuma conta fica na tela.
//
// Borda do dia: a meia-noite local (day.ts). O uso por hora já vem sem o tempo
// diante da tela de interrupção e sem os lançadores (usageHistory.ts e o
// nativo). "Hoje" entra com os números até agora, menos nas médias, que só usam
// dias completos.

import type { CheckInAnswer } from './checkIn';
import { addCalendarDays, calendarDaysBetween, fromDayKey, startOfDay, toDayKey } from './day';
import { getStreakSegments, type StreakHistory } from './milestones';
import {
  EMERGENCY_SOURCES,
  IGNORED_RESPONSES,
  RESPECTED_RESPONSES,
  type EmergencyOutcome,
  type EmergencySource,
  type InterruptionResponse,
} from './monitoring';
import { crossesMidnight, MINUTES_PER_DAY, type TimeRange } from './timeRange';

export const HOURS_PER_DAY = 24;
/** Uso por dia: os últimos 7 dias, hoje incluído. */
export const DAILY_USAGE_DAYS = 7;
/** Uso por semana: as últimas 8 semanas de 7 dias, a mais recente terminando hoje. */
export const WEEKLY_USAGE_WEEKS = 8;
/** Horários de maior uso: média dos dias completos com dados nos últimos 30 dias. */
export const HOURLY_AVERAGE_DAYS = 30;

const SECONDS_PER_MINUTE = 60;

const shift = (dayKey: string, days: number): string => {
  const day = fromDayKey(dayKey);
  if (day === null) throw new RangeError('Dia inválido');
  return toDayKey(addCalendarDays(day, days));
};

// ---------------------------------------------------------------------------
// Uso (moderação)

/** Uma linha de `app_usage_hourly` de uma compulsão. */
export type UsageRow = {
  readonly dayKey: string;
  readonly hour: number;
  readonly appPackage: string;
  readonly seconds: number;
};

export type UsageInput = {
  readonly rows: readonly UsageRow[];
  /** Dias com histórico (dados do dia inteiro), mesmo com uso zero. */
  readonly coveredDayKeys: ReadonlySet<string>;
  readonly todayKey: string;
  /** Só este app; null ou ausente = todos os apps da compulsão. */
  readonly appPackage?: string | null;
};

function secondsByDay(input: UsageInput): Map<string, number> {
  const totals = new Map<string, number>();
  for (const row of input.rows) {
    if (input.appPackage != null && row.appPackage !== input.appPackage) continue;
    totals.set(row.dayKey, (totals.get(row.dayKey) ?? 0) + row.seconds);
  }
  return totals;
}

export type DayUsage = {
  readonly dayKey: string;
  /** Minutos no dia; null se o aparelho não tinha dados do dia (sem acesso ao uso). */
  readonly minutes: number | null;
};

/** Uso por dia nos últimos `days` dias, do mais antigo a hoje. */
export function getDailyUsage(input: UsageInput, days: number = DAILY_USAGE_DAYS): DayUsage[] {
  const seconds = secondsByDay(input);
  return Array.from({ length: days }, (_, index) => {
    const dayKey = shift(input.todayKey, index - days + 1);
    return {
      dayKey,
      minutes: input.coveredDayKeys.has(dayKey)
        ? Math.floor((seconds.get(dayKey) ?? 0) / SECONDS_PER_MINUTE)
        : null,
    };
  });
}

export type WeekUsage = {
  readonly startDayKey: string;
  readonly endDayKey: string;
  /** Soma dos dias com dados; null se nenhum dia da semana tem dados. */
  readonly minutes: number | null;
  /** Quantos dos 7 dias têm dados. */
  readonly coveredDays: number;
};

/**
 * Uso por semana nas últimas `weeks` semanas, da mais antiga à atual. Semana =
 * 7 dias seguidos, a atual terminando hoje (com os números até agora): sem
 * depender do dia em que a semana começa. Soma os minutos de cada dia, como o
 * uso por dia mostra.
 */
export function getWeeklyUsage(input: UsageInput, weeks: number = WEEKLY_USAGE_WEEKS): WeekUsage[] {
  const daily = getDailyUsage(input, weeks * DAILY_USAGE_DAYS);
  return Array.from({ length: weeks }, (_, index) => {
    const week = daily.slice(index * DAILY_USAGE_DAYS, (index + 1) * DAILY_USAGE_DAYS);
    const covered = week.filter((day) => day.minutes !== null);
    return {
      startDayKey: week[0]!.dayKey,
      endDayKey: week[week.length - 1]!.dayKey,
      minutes:
        covered.length === 0 ? null : covered.reduce((sum, day) => sum + (day.minutes ?? 0), 0),
      coveredDays: covered.length,
    };
  });
}

export type HourlyAverage = {
  /** Dias completos com dados usados na média (0 = ainda não dá para mostrar). */
  readonly days: number;
  /** Média de minutos em cada hora (0 a 23), sem arredondar. */
  readonly minutesByHour: readonly number[];
};

/**
 * Horários de maior uso: a média por hora dos dias completos com dados nos
 * últimos `days` dias, sem hoje (um dia pela metade puxaria a média das horas
 * que ainda não chegaram para baixo).
 */
export function getHourlyAverage(
  input: UsageInput,
  days: number = HOURLY_AVERAGE_DAYS,
): HourlyAverage {
  const first = shift(input.todayKey, -days);
  const usedDays = [...input.coveredDayKeys].filter((day) => day >= first && day < input.todayKey);
  const included = new Set(usedDays);
  const seconds = new Array<number>(HOURS_PER_DAY).fill(0);
  for (const row of input.rows) {
    if (!included.has(row.dayKey)) continue;
    if (input.appPackage != null && row.appPackage !== input.appPackage) continue;
    if (row.hour < 0 || row.hour >= HOURS_PER_DAY) continue;
    seconds[row.hour]! += row.seconds;
  }
  return {
    days: usedDays.length,
    minutesByHour: seconds.map((total) =>
      usedDays.length === 0 ? 0 : total / SECONDS_PER_MINUTE / usedDays.length,
    ),
  };
}

/** A hora de maior valor (a primeira, num empate), ou null se tudo for zero. */
export function getPeakHour(values: readonly number[]): number | null {
  let peak: number | null = null;
  values.forEach((value, hour) => {
    if (value > 0 && (peak === null || value > values[peak]!)) peak = hour;
  });
  return peak;
}

/** Apps com uso nas linhas, do mais usado ao menos usado (para o filtro por app). */
export function listUsageApps(rows: readonly UsageRow[]): string[] {
  const totals = new Map<string, number>();
  for (const row of rows)
    totals.set(row.appPackage, (totals.get(row.appPackage) ?? 0) + row.seconds);
  return [...totals]
    .filter(([, seconds]) => seconds > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([app]) => app);
}

// ---------------------------------------------------------------------------
// Gatilhos de horário

/** Intervalos de uma faixa dentro do dia, em minutos, com o fim até 1440. */
function spansOf(range: TimeRange): { start: number; end: number }[] {
  if (!crossesMidnight(range)) return [{ start: range.start, end: range.end }];
  if (range.end === 0) return [{ start: range.start, end: MINUTES_PER_DAY }];
  return [
    { start: range.start, end: MINUTES_PER_DAY },
    { start: 0, end: range.end },
  ];
}

/**
 * Horas (0 a 23) que tocam alguma faixa de gatilho declarada, para destacar no
 * gráfico de horários (spec 04, decisão 7). Uma faixa de 21:30 a 22:00 destaca
 * a hora das 21.
 */
export function getTriggerHours(ranges: readonly TimeRange[]): boolean[] {
  const spans = ranges.flatMap(spansOf);
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) => {
    const start = hour * 60;
    const end = start + 60;
    return spans.some((span) => span.start < end && span.end > start);
  });
}

// ---------------------------------------------------------------------------
// Alertas

/** Quantos instantes caem em cada hora local (0 a 23). */
export function countByHour(instants: readonly Date[]): number[] {
  const counts = new Array<number>(HOURS_PER_DAY).fill(0);
  for (const instant of instants) counts[instant.getHours()]! += 1;
  return counts;
}

export type InterruptionSummary = {
  readonly total: number;
  /** "Ir para a tela inicial" e "Emergência". */
  readonly respected: number;
  /** "Continuar mesmo assim" e "Ignorar o limite por hoje". */
  readonly ignored: number;
  /** Fechadas sem resposta (ex.: chamada recebida). */
  readonly unanswered: number;
};

const isOneOf = (values: readonly string[], value: string) => values.includes(value);

/** Telas de interrupção respeitadas e ignoradas (spec 04, 5.8). */
export function summarizeInterruptions(
  responses: readonly (InterruptionResponse | null)[],
): InterruptionSummary {
  let respected = 0;
  let ignored = 0;
  let unanswered = 0;
  for (const response of responses) {
    if (response === null) unanswered += 1;
    else if (isOneOf(RESPECTED_RESPONSES, response)) respected += 1;
    else if (isOneOf(IGNORED_RESPONSES, response)) ignored += 1;
  }
  return { total: responses.length, respected, ignored, unanswered };
}

// ---------------------------------------------------------------------------
// Dias e sequências

export type DayResults = {
  /** Dias já terminados e não reprovados, desde o dia do início. */
  readonly approved: number;
  /** Dias reprovados desde o início, hoje incluído. */
  readonly failed: number;
};

/**
 * Dias aprovados e reprovados da moderação desde o início (spec 04, 5.8).
 * Aprovado = dia já terminado e não reprovado: um dia pode passar do limite
 * com um ou dois "Continuar" e ainda ser aprovado. Hoje só conta se já foi
 * reprovado.
 */
export function countDayResults(input: {
  readonly startedAt: Date;
  readonly failedDayKeys: readonly string[];
  readonly now: Date;
}): DayResults {
  const startKey = toDayKey(input.startedAt);
  const todayKey = toDayKey(input.now);
  const failed = new Set(
    input.failedDayKeys.filter(
      (day) => fromDayKey(day) !== null && day >= startKey && day <= todayKey,
    ),
  );
  const finishedDays = Math.max(0, calendarDaysBetween(startOfDay(input.startedAt), input.now));
  const failedFinished = [...failed].filter((day) => day < todayKey).length;
  return { approved: finishedDays - failedFinished, failed: failed.size };
}

export type StreakRecord = {
  /** Base da sequência (streak 0): o início ou o dia de uma quebra. */
  readonly startDayKey: string;
  /** Dia da quebra que encerrou a sequência; null na atual. */
  readonly endDayKey: string | null;
  /** Duração em dias: até a quebra, ou até hoje na atual. */
  readonly days: number;
};

export type StreakStats = {
  readonly current: number;
  readonly longest: number;
  /** Da mais recente (a atual) à mais antiga. */
  readonly sequences: readonly StreakRecord[];
};

/**
 * Histórico de sequências (spec 04, 5.8), com a mesma regra da streak e dos
 * marcos (`getStreakSegments`): uma sequência dura da base até a quebra
 * seguinte, contando dias de calendário.
 */
export function getStreakStats(history: StreakHistory): StreakStats {
  const sequences = getStreakSegments(history).map((segment) => {
    const base = fromDayKey(segment.baseDayKey)!;
    const end = segment.endDayKey === null ? history.now : fromDayKey(segment.endDayKey)!;
    return {
      startDayKey: segment.baseDayKey,
      endDayKey: segment.endDayKey,
      days: Math.max(0, calendarDaysBetween(base, end)),
    };
  });
  return {
    current: sequences.at(-1)?.days ?? 0,
    longest: sequences.reduce((longest, sequence) => Math.max(longest, sequence.days), 0),
    sequences: sequences.reverse(),
  };
}

// ---------------------------------------------------------------------------
// Check-ins e emergência

export type CheckInSummary = {
  readonly total: number;
  readonly noRelapse: number;
  readonly relapse: number;
};

export function summarizeCheckIns(answers: readonly CheckInAnswer[]): CheckInSummary {
  const relapse = answers.filter((answer) => answer === 'relapse').length;
  return { total: answers.length, noRelapse: answers.length - relapse, relapse };
}

export type EmergencySummary = {
  readonly total: number;
  readonly bySource: { readonly [S in EmergencySource]: number };
};

/** Uso do botão de emergência: quantas vezes e de onde (spec 04, 5.8). */
export function summarizeEmergency(
  sessions: readonly { readonly source: EmergencySource }[],
): EmergencySummary {
  const bySource = Object.fromEntries(EMERGENCY_SOURCES.map((source) => [source, 0])) as Record<
    EmergencySource,
    number
  >;
  for (const session of sessions) bySource[session.source] += 1;
  return { total: sessions.length, bySource };
}

export type VictorySummary = {
  readonly total: number;
  /** "A vontade passou?" respondido com sim, no botão de emergência. */
  readonly emergency: number;
  /** "Ir para a tela inicial" na tela de interrupção. */
  readonly interruption: number;
};

/**
 * Vitórias (doc 01, 6.5.2 e 6.7; decisão de 24/09/2026): "A vontade passou?"
 * respondido com sim e "Ir para a tela inicial" na tela de interrupção, de
 * todas as compulsões. "Emergência" na tela não conta aqui: a vitória dela,
 * se houver, vem da resposta no fim da emergência.
 */
export function countVictories(input: {
  readonly emergencyOutcomes: readonly (EmergencyOutcome | null)[];
  readonly interruptionResponses: readonly (InterruptionResponse | null)[];
}): VictorySummary {
  const emergency = input.emergencyOutcomes.filter((outcome) => outcome === 'passed').length;
  const interruption = input.interruptionResponses.filter((response) => response === 'home').length;
  return { total: emergency + interruption, emergency, interruption };
}

// ---------------------------------------------------------------------------
// Duração em horas e minutos

/** Minutos em horas e minutos (para "1 h 05 min"). */
export function splitMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const rounded = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(rounded / 60), minutes: rounded % 60 };
}
