// Leitura dos eventos que o nativo grava (spec 03, seção 4.3). O nativo
// devolve JSON; aqui cada evento é conferido campo a campo antes de chegar ao
// banco. Um evento malformado não é importado, mas o id dele volta em
// `invalidIds` para ser apagado também (senão ficaria para sempre na fila).

import { CHECK_IN_ANSWERS } from '@/domain/checkIn';
import { INTERRUPTION_RESPONSES } from '@/domain/monitoring';
import { DAY_FAILURE_REASONS } from '@/domain/streak';
import { fromDayKey } from '@/domain/day';

import {
  MONITORING_EVENT_TYPES,
  NOTIFICATION_KINDS,
  PERMISSION_KINDS,
  SERVICE_START_ORIGINS,
  asTargetId,
  type MonitoringEvent,
} from './types';

type Fields = Record<string, unknown>;

const EMERGENCY_REQUEST_SOURCES = ['interruption', 'notification'] as const;

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isCompulsionId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/** Os campos de cada tipo, já convertidos; nulo se algum faltar ou vier errado. */
function parseBody(type: MonitoringEvent['type'], raw: Fields): Fields | null {
  switch (type) {
    case 'service_started':
      return oneOf(SERVICE_START_ORIGINS, raw.origin) ? { origin: raw.origin } : null;
    case 'limit_reached':
      if (!isCompulsionId(raw.compulsionId)) return null;
      if (raw.targetId !== null && raw.targetId !== undefined && !isId(raw.targetId)) return null;
      return {
        compulsionId: raw.compulsionId,
        targetId: isId(raw.targetId) ? asTargetId(raw.targetId) : null,
      };
    case 'notification_sent':
      return oneOf(NOTIFICATION_KINDS, raw.kind) ? { kind: raw.kind } : null;
    case 'interruption_shown':
      return isCompulsionId(raw.compulsionId) && isId(raw.targetId)
        ? { compulsionId: raw.compulsionId, targetId: asTargetId(raw.targetId) }
        : null;
    case 'interruption_response':
      return isId(raw.interruptionId) &&
        isCompulsionId(raw.compulsionId) &&
        oneOf(INTERRUPTION_RESPONSES, raw.response)
        ? {
            interruptionId: raw.interruptionId,
            compulsionId: raw.compulsionId,
            response: raw.response,
          }
        : null;
    case 'day_failed':
      return isCompulsionId(raw.compulsionId) && oneOf(DAY_FAILURE_REASONS, raw.reason)
        ? { compulsionId: raw.compulsionId, reason: raw.reason }
        : null;
    case 'check_in_answered':
      return isCompulsionId(raw.compulsionId) && oneOf(CHECK_IN_ANSWERS, raw.answer)
        ? { compulsionId: raw.compulsionId, answer: raw.answer }
        : null;
    case 'emergency_requested':
      return oneOf(EMERGENCY_REQUEST_SOURCES, raw.source) ? { source: raw.source } : null;
    case 'permission_lost':
      return oneOf(PERMISSION_KINDS, raw.permission) ? { permission: raw.permission } : null;
  }
}

/**
 * Confere a lista crua do nativo. Mantém a ordem. Um item sem id aproveitável
 * é descartado sem volta: não há como pedir ao nativo para apagá-lo, e o
 * nativo não grava evento sem id.
 */
export function parseNativeEvents(raw: unknown): {
  events: MonitoringEvent[];
  invalidIds: string[];
} {
  const events: MonitoringEvent[] = [];
  const invalidIds: string[] = [];
  if (!Array.isArray(raw)) return { events, invalidIds };

  for (const item of raw) {
    if (!isObject(item) || !isId(item.id)) continue;
    const valid =
      typeof item.at === 'number' &&
      Number.isFinite(item.at) &&
      typeof item.dayKey === 'string' &&
      fromDayKey(item.dayKey) !== null &&
      oneOf(MONITORING_EVENT_TYPES, item.type);
    const body = valid ? parseBody(item.type as MonitoringEvent['type'], item) : null;
    if (body === null) {
      invalidIds.push(item.id);
      continue;
    }
    events.push({
      id: item.id,
      at: item.at as number,
      dayKey: item.dayKey as string,
      type: item.type,
      ...body,
    } as MonitoringEvent);
  }
  return { events, invalidIds };
}
