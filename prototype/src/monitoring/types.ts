/**
 * Interface comum de monitoramento (spec secao 5.2).
 *
 * O objetivo desta interface no protótipo nao e abstrair bonito: e descobrir, na
 * pratica, quais funcoes conseguem ter o mesmo formato nas duas plataformas e
 * quais nao conseguem. O que sobrar de diferente vira resposta do experimento C1
 * no relatorio de viabilidade.
 */

import type {
  InstalledApp,
  LogEvent,
  PermissionStatus,
  UsageEntry,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type {
  InstalledApp,
  LogEvent,
  PermissionState,
  PermissionStatus,
  UsageEntry,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type SelectionSummary = {
  apps: InstalledApp[];
};

export type UsageLimitConfig = {
  minutes: number;
  motivation: string;
};

export type AdultContentWatchConfig = {
  mode: 'alert' | 'block';
};

export interface MonitoringModule {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestPermissions(): Promise<PermissionStatus>;

  /** Android: lista propria de apps. iOS: seletor da Apple (I2). */
  selectTargets(): Promise<SelectionSummary | Unsupported>;

  startUsageLimit(config: UsageLimitConfig): Promise<void>;
  stopUsageLimit(): Promise<void>;

  startAdultContentWatch(config: AdultContentWatchConfig): Promise<void>;
  stopAdultContentWatch(): Promise<void>;

  getUsageToday(): Promise<UsageEntry[] | Unsupported>;

  getLog(): Promise<LogEvent[]>;
  clearLog(): Promise<void>;
  logEvent(experiment: string, event: string, details?: string): Promise<void>;
}

/**
 * Erro de funcao que ainda nao chegou a vez. Carrega o ID do experimento que vai
 * implementa-la, para a tela de laboratorio conseguir dizer ao responsavel
 * exatamente o que falta, em vez de dar um erro generico.
 */
export class NotImplementedYetError extends Error {
  constructor(readonly experiment: string, method: string) {
    super(`${method}() ainda nao foi implementado — chega no experimento ${experiment}`);
    this.name = 'NotImplementedYetError';
  }
}
