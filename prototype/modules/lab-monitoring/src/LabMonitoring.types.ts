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
  notifications: PermissionState;
  overlay: PermissionState;
  /** A6: consentimento de VPN do sistema (VpnService.prepare). */
  vpn: PermissionState;
};

export type NotificationPermissionResult = {
  /** Se o pop-up chegou a ser exibido. Falso no Android 12 ou anterior. */
  requested: boolean;
  notifications: PermissionState;
};


/**
 * Qual variante do intent abriu os Ajustes. 'targeted' aponta direto para o app
 * e nem todo fabricante respeita; 'generic' abre a lista completa.
 */
export type SettingsRoute = 'targeted' | 'generic' | 'unavailable';

export type UsageAccessRequestResult = {
  /** Se a tela de Ajustes chegou a abrir. A concessao em si acontece fora do app. */
  settingsOpened: boolean;
  settingsRoute: SettingsRoute;
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

export type UsageLimitStatus = {
  active: boolean;
  minutes: number;
  packages: string[];
  /** Texto neutro do alerta (experimento C2). */
  message: string;
  interruptionMode: InterruptionMode;
  /** Epoch em ms do ultimo alerta de nivel 2; 0 se ainda nao houve. */
  escalatedAt: number;
  /** Epoch em ms de quando o limite foi atingido; 0 se ainda nao foi. */
  firedAt: number;
  /** A5: duracao da pausa depois do "Continuar mesmo assim", em minutos. */
  pauseMinutes: number;
  /** A5: epoch em ms do fim da pausa pendente; 0 se nao ha pausa. */
  pausedUntil: number;
};

/** Abordagem da tela de interrupcao do A4. */
export type InterruptionMode = 'overlay' | 'activity';

export type OverlayPermissionResult = {
  settingsOpened: boolean;
};

/** A6: 'alert' detecta e deixa passar; 'block' responde "dominio inexistente". */
export type DomainWatchMode = 'alert' | 'block';

export type VpnPermissionResult = {
  /** Se a caixa de consentimento do sistema chegou a ser aberta. */
  requested: boolean;
  vpn: PermissionState;
};

/** Contadores da sessao atual da VPN local (A6), zerados a cada inicio. */
export type DomainWatchStats = {
  queries: number;
  forwarded: number;
  failed: number;
  detected: number;
  blocked: number;
  suppressed: number;
  otherPackets: number;
  /** A7: consultas a dominios de rede social, de qualquer app. */
  social: number;
  averageUpstreamMs: number;
};

export type DomainWatchStatus = {
  permission: PermissionState;
  running: boolean;
  mode: DomainWatchMode;
  domains: string[];
  /** A7: dominios de rede social cujo acesso so e registrado. */
  socialDomains: string[];
  stats: DomainWatchStats | null;
};
