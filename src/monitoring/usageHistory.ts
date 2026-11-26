import { fromDayKey } from '@/domain/day';

import { asTargetId, type UsageHistory, type UsageHistoryDay } from './types';

// Leitura do histórico de uso que o nativo devolve em JSON (spec 04, 4.4).
// Desconfia de tudo: um dia malformado é descartado, não derruba a importação.

const HOURS = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseHours(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== HOURS) return null;
  const hours = value.map((seconds) =>
    typeof seconds === 'number' && Number.isInteger(seconds) && seconds >= 0 && seconds <= 3600
      ? seconds
      : null,
  );
  return hours.every((seconds) => seconds !== null) ? (hours as number[]) : null;
}

function parseDay(value: unknown): UsageHistoryDay | null {
  if (!isRecord(value)) return null;
  const { dayKey, covered, apps } = value;
  if (typeof dayKey !== 'string' || fromDayKey(dayKey) === null) return null;
  if (typeof covered !== 'boolean' || !isRecord(apps)) return null;
  const parsed: Record<string, number[]> = {};
  for (const [targetId, hours] of Object.entries(apps)) {
    const valid = parseHours(hours);
    if (valid === null || targetId.length === 0) return null;
    parsed[asTargetId(targetId)] = valid;
  }
  return { dayKey, covered, apps: parsed };
}

/** O JSON do `getUsageHistory` nativo; nulo se nem o formato geral for válido. */
export function parseUsageHistory(json: string): UsageHistory | null {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isRecord(raw) || typeof raw.today !== 'string' || fromDayKey(raw.today) === null) {
    return null;
  }
  if (!Array.isArray(raw.days)) return null;
  const days = raw.days
    .map(parseDay)
    .filter((day): day is UsageHistoryDay => day !== null)
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0));
  return { today: raw.today, days };
}
