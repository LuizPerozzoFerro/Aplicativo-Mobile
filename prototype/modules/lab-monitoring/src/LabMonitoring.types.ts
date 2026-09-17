/**
 * Tipos do modulo nativo de laboratorio.
 *
 * Toda funcao que nao existe numa plataforma devolve 'unsupported' de forma
 * explicita, nunca um valor vazio disfarcado (CLAUDE.md secao 8.3).
 */

export const UNSUPPORTED = 'unsupported';
export type Unsupported = typeof UNSUPPORTED;

/** Formato de evento definido na spec, secao 5.3. */
export type LogEvent = {
  timestamp: string;
  platform: 'ios' | 'android';
  source: string;
  experiment: string;
  event: string;
  details?: string | null;
};

export type PermissionState = 'granted' | 'denied' | Unsupported;

export type PermissionStatus = {
  usageAccess: PermissionState;
};

export type UsageAccessRequestResult = {
  /** Se a tela de Ajustes chegou a abrir. A concessao em si acontece fora do app. */
  settingsOpened: boolean;
  usageAccess: PermissionState;
};

export type UsageEntry = {
  packageName: string;
  appLabel: string;
  milliseconds: number;
  minutes: number;
  /** Epoch em milissegundos da ultima vez que o app esteve em primeiro plano. */
  lastTimeUsed: number;
};

export type InstalledApp = {
  packageName: string;
  appLabel: string;
};
