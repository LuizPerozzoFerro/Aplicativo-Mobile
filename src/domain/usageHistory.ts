// Do histórico do nativo às linhas do banco (spec 04, 4.4). Regras puras:
// distribuem o uso de cada app pelas compulsões que o acompanham e descontam o
// tempo diante da tela de interrupção, porque com a sobreposição aberta o
// Android continua contando o app que está por baixo.

import { fromDayKey } from './day';

export type HistoryDayInput = {
  readonly dayKey: string;
  /** Segundos por hora local (24 posições), por app. */
  readonly apps: Readonly<Record<string, readonly number[]>>;
};

export type CompulsionApps = {
  readonly compulsionId: number;
  /** Apps de vídeos curtos da compulsão. Um app em duas compulsões conta nas duas. */
  readonly appPackages: readonly string[];
};

export type InterruptionSpan = {
  readonly appPackage: string;
  readonly shownAt: Date;
  /** Nulo se a tela fechou sem resposta (ex.: chamada): o fim é desconhecido e nada é descontado. */
  readonly respondedAt: Date | null;
};

export type HourlyRow = {
  readonly dayKey: string;
  readonly hour: number;
  readonly compulsionId: number;
  readonly appPackage: string;
  readonly seconds: number;
};

const MS_PER_SECOND = 1000;

/** Segundos de tela de interrupção sobre o app, por hora local do dia. */
export function interruptionSecondsByHour(
  dayKey: string,
  appPackage: string,
  spans: readonly InterruptionSpan[],
): number[] {
  const result = new Array<number>(24).fill(0);
  const day = fromDayKey(dayKey);
  if (day === null) return result;
  for (const span of spans) {
    if (span.appPackage !== appPackage || span.respondedAt === null) continue;
    const from = span.shownAt.getTime();
    const to = span.respondedAt.getTime();
    if (to <= from) continue;
    for (let hour = 0; hour < 24; hour += 1) {
      // Horas locais pelo calendário (Date ajusta o horário de verão).
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime();
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1).getTime();
      const overlap = Math.min(end, to) - Math.max(start, from);
      if (overlap > 0) result[hour] = (result[hour] ?? 0) + overlap / MS_PER_SECOND;
    }
  }
  return result.map(Math.floor);
}

/**
 * As linhas de um dia: para cada compulsão, cada app dela e cada hora com uso,
 * os segundos menos o tempo das telas de interrupção sobre o app (nunca
 * negativo). Horas sem uso não viram linha.
 */
export function buildHourlyRows(
  day: HistoryDayInput,
  compulsions: readonly CompulsionApps[],
  interruptions: readonly InterruptionSpan[],
): HourlyRow[] {
  const rows: HourlyRow[] = [];
  for (const { compulsionId, appPackages } of compulsions) {
    for (const appPackage of [...new Set(appPackages)].sort()) {
      const hours = day.apps[appPackage];
      if (hours === undefined) continue;
      const discount = interruptionSecondsByHour(day.dayKey, appPackage, interruptions);
      hours.forEach((seconds, hour) => {
        const net = Math.max(0, Math.min(3600, seconds) - (discount[hour] ?? 0));
        if (net > 0)
          rows.push({ dayKey: day.dayKey, hour, compulsionId, appPackage, seconds: net });
      });
    }
  }
  return rows;
}
