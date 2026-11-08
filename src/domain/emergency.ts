// Regras puras do botão de emergência (spec 03, 5.5; doc 01, 6.7). Os tempos
// saem do relógio, e não de contar "ticks": com o app em segundo plano ou a
// tela apagada, o JavaScript para, mas o tempo da etapa continua correndo.

import { EMERGENCY_SOURCES, type EmergencySource } from './monitoring';

/** Respiração guiada: 1 minuto. */
export const EMERGENCY_BREATHING_MS = 60_000;
/** Cronômetro com sugestões: 5 minutos. */
export const EMERGENCY_WAIT_MS = 5 * 60_000;

/** Um ciclo de 10 s: seis ciclos completos cabem no minuto da respiração. */
export const BREATH_INHALE_MS = 4_000;
export const BREATH_EXHALE_MS = 6_000;
const BREATH_CYCLE_MS = BREATH_INHALE_MS + BREATH_EXHALE_MS;

export type BreathingPhase = {
  kind: 'inhale' | 'exhale';
  /** Conta os ciclos: identifica a fase, para a animação recomeçar a cada troca. */
  cycle: number;
  /** Quanto falta para esta fase terminar. */
  remainingMs: number;
};

export function getBreathingPhase(elapsedMs: number): BreathingPhase {
  const elapsed = Math.max(0, elapsedMs);
  const cycle = Math.floor(elapsed / BREATH_CYCLE_MS);
  const position = elapsed - cycle * BREATH_CYCLE_MS;
  return position < BREATH_INHALE_MS
    ? { kind: 'inhale', cycle, remainingMs: BREATH_INHALE_MS - position }
    : { kind: 'exhale', cycle, remainingMs: BREATH_CYCLE_MS - position };
}

/** Segundos que faltam, arredondados para cima: o 0:00 só aparece quando acabou. */
export function getRemainingSeconds(durationMs: number, elapsedMs: number): number {
  return Math.ceil(Math.max(0, durationMs - Math.max(0, elapsedMs)) / 1000);
}

/** Cronômetro no formato m:ss. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Origem informada no endereço da rota. O endereço pode vir de fora do app,
 * então só valores conhecidos passam; o resto conta como aberto pelo Início.
 */
export function parseEmergencySource(value: unknown): EmergencySource {
  return EMERGENCY_SOURCES.find((source) => source === value) ?? 'home';
}
