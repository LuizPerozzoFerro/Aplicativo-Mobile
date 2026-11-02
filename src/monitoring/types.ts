// Interface comum de monitoramento (spec 01, seção 4.8), baseada na spec 00
// (seção 5.2) e no relatório de viabilidade (seção 7). As diferenças entre
// Android e iOS ficam nas implementações; quem usa só conhece estes tipos.
//
// Regras:
// - função sem suporte na plataforma responde UNSUPPORTED, nunca um valor
//   vazio disfarçado nem falha em silêncio (CLAUDE.md, seção 8.3);
// - a seleção de alvos é opaca: no Android o identificador é o pacote, no iOS
//   será um token do seletor da Apple. O app guarda e devolve o identificador
//   sem interpretá-lo;
// - nada daqui vai para logs nem sai do aparelho (CLAUDE.md, seção 9).

export const UNSUPPORTED = 'unsupported';
export type Unsupported = typeof UNSUPPORTED;

export type MonitoringPlatform = 'android' | 'ios';

export const PERMISSION_KINDS = ['usageAccess', 'notifications', 'overlay'] as const;
/**
 * - `usageAccess`: Android, acesso ao uso (ajuste especial); iOS, autorização
 *   do Screen Time.
 * - `notifications`: notificação do alerta.
 * - `overlay`: Android, "Aparecer sobre outros apps" (tela de interrupção).
 *   Sem equivalente no iOS.
 *
 * Sem VPN na primeira versão (D6).
 */
export type PermissionKind = (typeof PERMISSION_KINDS)[number];
export type PermissionState = 'granted' | 'denied' | Unsupported;
export type PermissionStatus = { readonly [K in PermissionKind]: PermissionState };

declare const targetIdBrand: unique symbol;
/** Identificador opaco de um app monitorado. Não montar nem interpretar. */
export type TargetId = string & { readonly [targetIdBrand]: true };

/**
 * Converte de volta um identificador que veio do próprio módulo e foi guardado
 * (por exemplo, `monitored_apps.package_name`). Não usar com valor digitado.
 */
export function asTargetId(value: string): TargetId {
  return value as TargetId;
}

export type MonitoringErrorCode = 'permission_required' | 'invalid_config';

/** Erro explícito do monitoramento, para a tela decidir o que mostrar. */
export class MonitoringError extends Error {
  constructor(
    readonly code: MonitoringErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

export type MonitoringTarget = {
  readonly id: TargetId;
  /** Nome do app, quando a plataforma o fornece (Android). No iOS, nulo. */
  readonly label: string | null;
};

/**
 * Regra de limite diário: ao somar `dailyLimitMinutes` de uso nos alvos, no dia
 * local (src/domain/day.ts), o módulo alerta. Uma regra por app ou uma para
 * vários apps juntos: quem monta as regras decide.
 */
export type UsageRule = {
  /** Identificador da regra, para os eventos dizerem qual foi atingida. */
  readonly id: string;
  readonly targetIds: readonly TargetId[];
  readonly dailyLimitMinutes: number;
  /** Se, além da notificação, mostra a tela de interrupção. */
  readonly interruption: boolean;
};

export type UsageLimitConfig = { readonly rules: readonly UsageRule[] };

export type UsageLimitStatus =
  { readonly active: false } | { readonly active: true; readonly rules: readonly UsageRule[] };

export type UsageEntry = {
  readonly targetId: TargetId;
  /** Tempo em primeiro plano hoje (dia local), em milissegundos. */
  readonly milliseconds: number;
};

export const MONITORING_EVENT_TYPES = [
  'limit_reached',
  'notification_sent',
  'interruption_shown',
  'permission_lost',
] as const;
export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];

/** Evento gravado pelo monitoramento (o "log comum" do relatório, seção 7.3). */
export type MonitoringEvent = {
  /** Instante em milissegundos desde a época Unix. */
  readonly timestamp: number;
  readonly type: MonitoringEventType;
  readonly ruleId?: string;
  readonly targetId?: TargetId;
  readonly permission?: PermissionKind;
};

export interface MonitoringModule {
  readonly platform: MonitoringPlatform;

  /** Estado atual das permissões. Consultar de novo ao voltar ao app (I-30). */
  getPermissionStatus(): Promise<PermissionStatus>;
  /**
   * Pede uma permissão. No Android, acesso ao uso e sobreposição abrem os
   * Ajustes e a concessão acontece fora do app: o estado devolvido é o do
   * momento, e a tela deve consultar de novo ao voltar.
   */
  requestPermission(kind: PermissionKind): Promise<PermissionState>;

  /** Android: apps instalados que o usuário pode escolher. iOS: UNSUPPORTED. */
  listTargets(): Promise<MonitoringTarget[] | Unsupported>;
  /**
   * iOS: abre o seletor da Apple. Android: UNSUPPORTED (a escolha é numa tela
   * do app, sobre `listTargets()`). Nulo se o usuário cancelar.
   */
  pickTargets(): Promise<MonitoringTarget[] | null | Unsupported>;

  /** Liga (ou reconfigura) o limite de uso. Substitui as regras anteriores. */
  startUsageLimit(config: UsageLimitConfig): Promise<void>;
  stopUsageLimit(): Promise<void>;
  getUsageLimitStatus(): Promise<UsageLimitStatus>;

  /** Uso de hoje por alvo. iOS: UNSUPPORTED (só por extensão de relatório). */
  getUsageToday(): Promise<UsageEntry[] | Unsupported>;

  /**
   * Detecção de domínios pela VPN local. UNSUPPORTED enquanto a flag
   * `domainMonitoring` estiver desligada (D6, doc 02, seção 3.4).
   */
  startDomainWatch(): Promise<void | Unsupported>;
  stopDomainWatch(): Promise<void | Unsupported>;

  /** Eventos gravados desde a última limpeza, do mais antigo ao mais novo. */
  getEvents(): Promise<MonitoringEvent[]>;
  clearEvents(): Promise<void>;
}
