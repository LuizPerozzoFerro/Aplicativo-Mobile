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
  UsageLimitStatus,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type {
  InstalledApp,
  LogEvent,
  PermissionState,
  PermissionStatus,
  UsageEntry,
  UsageLimitStatus,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type SelectionSummary = {
  apps: InstalledApp[];
};

export type UsageLimitConfig = {
  minutes: number;
  /** Pacotes Android a monitorar. No iOS a selecao vem do seletor da Apple (I2). */
  packages: string[];
  /** Texto exibido na tela de interrupcao. Passa a ter efeito no A4. */
  motivation?: string;
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
  getUsageLimitStatus(): Promise<UsageLimitStatus>;

  /** Abre os ajustes de notificacao do app. Necessario para o alerta do A3. */
  openNotificationSettings(): Promise<boolean>;

  startAdultContentWatch(config: AdultContentWatchConfig): Promise<void>;
  stopAdultContentWatch(): Promise<void>;

  getUsageToday(): Promise<UsageEntry[] | Unsupported>;

  /**
   * Segunda via de leitura do uso, reconstruida a partir do fluxo de eventos.
   * Depois do teste no aparelho, esta e a via recomendada: o getUsageToday conta
   * tempo de tela apagada (ver "Achado A1" em NOTAS.md).
   */
  getUsageTodayFromEvents(): Promise<UsageEntry[] | Unsupported>;

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
