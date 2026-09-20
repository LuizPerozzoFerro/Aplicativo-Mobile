/**
 * Interface comum de monitoramento (spec secao 5.2).
 *
 * O objetivo desta interface no protótipo nao e abstrair bonito: e descobrir, na
 * pratica, quais funcoes conseguem ter o mesmo formato nas duas plataformas e
 * quais nao conseguem. O que sobrar de diferente vira resposta do experimento C1
 * no relatorio de viabilidade.
 */

import type {
  DomainWatchMode,
  DomainWatchStatus,
  VpnPermissionResult,
  InstalledApp,
  LogEvent,
  PermissionStatus,
  UsageEntry,
  UsageLimitStatus,
  NotificationPermissionResult,
  InterruptionMode,
  OverlayPermissionResult,
  HideOverlayWindowsResult,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type {
  DomainWatchMode,
  DomainWatchStats,
  DomainWatchStatus,
  VpnPermissionResult,
  InstalledApp,
  LogEvent,
  PermissionState,
  PermissionStatus,
  UsageEntry,
  UsageLimitStatus,
  NotificationPermissionResult,
  InterruptionMode,
  OverlayPermissionResult,
  HideOverlayWindowsResult,
  Unsupported,
} from '../../modules/lab-monitoring/src/LabMonitoring.types';

export type SelectionSummary = {
  apps: InstalledApp[];
};

export type UsageLimitConfig = {
  minutes: number;
  /** Pacotes Android a monitorar. No iOS a selecao vem do seletor da Apple (I2). */
  packages: string[];
  /** Abordagem da tela de interrupcao (A4). */
  interruptionMode: InterruptionMode;
  /** Texto neutro do alerta (A3). Configuravel para atender o C2. */
  message: string;
  /** A5: minutos sem alerta depois do "Continuar mesmo assim". */
  pauseMinutes: number;
};

export type AdultContentWatchConfig = {
  mode: DomainWatchMode;
  /**
   * Lista de dominios vigiados. Nos testes, dominios inofensivos fazendo as vezes
   * de "adultos" (CLAUDE.md secao 9). Acrescentada ao esboco da spec, que so
   * previa o modo.
   */
  domains: string[];
  /**
   * A7: dominios de rede social (ex.: instagram.com) cujo acesso so e registrado,
   * com o app que estava em primeiro plano. Nunca alertam nem bloqueiam.
   */
  socialDomains: string[];
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

  requestNotificationPermission(): Promise<NotificationPermissionResult>;

  /** A4: abre os Ajustes de "Aparecer sobre outros apps". */
  requestOverlayPermission(): Promise<OverlayPermissionResult>;

  /** Fecha a tela de interrupcao, se estiver visivel. */
  hideInterruption(): Promise<void>;

  /**
   * A4 / I-25: liga na tela do laboratorio a protecao contra sobreposicoes de
   * terceiros, para medir se a tela de interrupcao ainda aparece por cima.
   */
  setHideOverlayWindows(hide: boolean): Promise<HideOverlayWindowsResult>;

  /** Dispara o alerta do A3 imediatamente, sem esperar o limite. */
  sendTestAlert(): Promise<void>;

  /** A6: caixa de consentimento de VPN do sistema. */
  requestVpnPermission(): Promise<VpnPermissionResult>;
  startAdultContentWatch(config: AdultContentWatchConfig): Promise<void>;
  stopAdultContentWatch(): Promise<void>;
  getDomainWatchStatus(): Promise<DomainWatchStatus>;

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
