// Valores e regras puras do monitoramento da Fase 4 (spec 03; doc 01 v0.8,
// seções 6.5 a 6.7). As regras do momento vivem no nativo (spec 03, 4.1);
// aqui fica o que o JS decide antes de enviar a configuração e o que o banco
// guarda. Valores técnicos: nunca em logs nem fora do aparelho.

import { ALL_DAY, mergeTimeRanges, type TimeRange } from './timeRange';

/** Uso diário que dispara o aviso de um app de risco, por app (doc 01, 6.5.6). */
export const RISK_APP_DAILY_LIMIT_MINUTES = 10;

/** Preventivas por dia, no máximo: o limite de 6 menos check-in e recomeço (spec 03, 5.4). */
export const MAX_PREVENTIVE_NOTIFICATIONS_PER_DAY = 4;

/** Respostas da tela de interrupção (spec 03, 4.3 e 5.6). */
export const INTERRUPTION_RESPONSES = ['emergency', 'home', 'continue', 'ignore_today'] as const;
export type InterruptionResponse = (typeof INTERRUPTION_RESPONSES)[number];

/** De onde a emergência foi aberta (spec 03, 5.6). */
export const EMERGENCY_SOURCES = ['home', 'interruption', 'notification'] as const;
export type EmergencySource = (typeof EMERGENCY_SOURCES)[number];

/** Como a sessão de emergência terminou (spec 03, 5.6). "passed" conta como vitória. */
export const EMERGENCY_OUTCOMES = ['passed', 'not_passed', 'abandoned'] as const;
export type EmergencyOutcome = (typeof EMERGENCY_OUTCOMES)[number];

/**
 * Horários (minutos desde a meia-noite) das preventivas de um dia (spec 03,
 * 5.4): o início de cada faixa depois de unir as vizinhas e as sobrepostas
 * (a regra do resumo da Fase 3), em ordem de horário, no máximo 4. Faixas que
 * cobrem o dia todo não têm início: nenhuma preventiva.
 */
export function getPreventiveStartMinutes(ranges: readonly TimeRange[]): number[] {
  const merged = mergeTimeRanges(ranges);
  if (merged === ALL_DAY) return [];
  return merged
    .map((range) => range.start)
    .sort((a, b) => a - b)
    .slice(0, MAX_PREVENTIVE_NOTIFICATIONS_PER_DAY);
}
