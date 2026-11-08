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

import type { CheckInAnswer } from '@/domain/checkIn';
import type { CompulsionType } from '@/domain/compulsion';
import type { InterruptionResponse } from '@/domain/monitoring';
import type { DayFailureReason } from '@/domain/streak';
import type { Emotion, Weekday } from '@/domain/triggers';

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

/**
 * Configuração que o JS envia ao nativo (spec 03, seção 4.2) sempre que algo
 * muda e ao abrir o app. O nativo guarda a última em disco e a usa depois do
 * reinício, sem o JS. Montada em src/features/monitoring/config.ts.
 */
export type MonitoringConfig = {
  /** Versão do formato. O nativo recusa uma que não conhece. */
  readonly version: typeof MONITORING_CONFIG_VERSION;
  readonly compulsions: readonly MonitoringCompulsionConfig[];
  /** Moderação: um limite somado por compulsão, valendo para todos os apps dela. */
  readonly moderationRules: readonly ModerationRuleConfig[];
  /** Conteúdo adulto: um limite por app de risco. */
  readonly riskAppRules: readonly RiskAppRuleConfig[];
  /** Horário do check-in em minutos desde a meia-noite; nulo sem compulsão de abstinência ativa. */
  readonly checkInMinutes: number | null;
  /** A compulsão do check-in (a de abstinência); nula sem abstinência ativa. */
  readonly checkInCompulsionId: number | null;
  /** Dias (AAAA-MM-DD) com notificação de recomeço pendente (src/domain/restart.ts). */
  readonly restartDayKeys: readonly string[];
  /** Endereços do app que as notificações e a tela de interrupção abrem. */
  readonly links: {
    readonly permissions: string;
    readonly emergencyFromNotification: string;
    readonly emergencyFromInterruption: string;
  };
  readonly preventive: PreventiveConfig;
  /** Motivação do usuário, para a tela de interrupção e as notificações. */
  readonly motivation: string | null;
  /** Todos os textos que o nativo exibe, já traduzidos (spec 03, 4.2). */
  readonly texts: MonitoringTexts;
};

export const MONITORING_CONFIG_VERSION = 1;

export type MonitoringCompulsionConfig = {
  readonly id: number;
  readonly type: CompulsionType;
  /** Dia a partir do qual a streak conta (AAAA-MM-DD): diz se havia streak a perder. */
  readonly streakBaseDayKey: string;
  /** Último dia com check-in respondido (AAAA-MM-DD), ou nulo. Só na abstinência. */
  readonly checkInAnsweredDayKey: string | null;
};

export type ModerationRuleConfig = {
  readonly compulsionId: number;
  readonly targetIds: readonly TargetId[];
  /** O limite escolhido, que vale a partir do dia seguinte a um aumento. */
  readonly dailyLimitMinutes: number;
  /** No dia de um aumento, o limite que continua valendo só nele; senão, nulo. */
  readonly limitToday: { readonly dayKey: string; readonly minutes: number } | null;
};

export type RiskAppRuleConfig = {
  readonly compulsionId: number;
  readonly targetId: TargetId;
  readonly dailyLimitMinutes: number;
  /** Se o usuário declarou consumir o conteúdo nele: só então há tela de interrupção. */
  readonly interruption: boolean;
};

export type PreventiveConfig = {
  /** Dias da semana (0 = domingo) com preventivas: os marcados, ou todos. */
  readonly weekdays: readonly Weekday[];
  /** Horários das preventivas, em minutos desde a meia-noite (no máximo 4). */
  readonly startMinutes: readonly number[];
  readonly emotions: readonly Emotion[];
};

/**
 * Textos do nativo. Crescem a cada passo da Fase 4: aqui só os que o nativo
 * já mostra. Neutros e sem termo explícito (CLAUDE.md, seção 9).
 */
export type MonitoringTexts = {
  readonly channels: {
    readonly tracking: string;
    readonly alerts: string;
    readonly reminders: string;
  };
  readonly ongoing: { readonly title: string; readonly text: string };
  readonly notifications: {
    /** Versão neutra para a tela bloqueada. */
    readonly public: { readonly title: string; readonly text: string };
    readonly emergencyAction: string;
    readonly limit: { readonly title: string; readonly text: string };
    readonly riskApp: { readonly title: string; readonly text: string };
    readonly checkIn: {
      readonly title: string;
      readonly text: string;
      readonly noRelapse: string;
      readonly relapse: string;
    };
    readonly preventive: {
      readonly title: string;
      readonly generic: string;
      /** Com o marcador `{motivation}`, trocado pelo nativo. */
      readonly withMotivation: string;
      readonly byEmotion: { readonly [E in Emotion]: string };
    };
    readonly restart: { readonly title: string; readonly text: string };
    readonly protectionPaused: { readonly title: string; readonly text: string };
  };
  readonly interruption: {
    readonly brand: string;
    readonly title: string;
    /** Frases de apoio, alternadas a cada tela (spec 03, 5.9). */
    readonly phrases: readonly string[];
    readonly motivationLabel: string;
    readonly emergency: string;
    readonly home: string;
    readonly continue: string;
    readonly ignoreToday: string;
    readonly endOfDayWarning: string;
  };
};

export const MONITORING_EVENT_TYPES = [
  'service_started',
  'limit_reached',
  'notification_sent',
  'interruption_shown',
  'interruption_response',
  'day_failed',
  'check_in_answered',
  'emergency_requested',
  'permission_lost',
] as const;
export type MonitoringEventType = (typeof MONITORING_EVENT_TYPES)[number];

export const SERVICE_START_ORIGINS = ['app', 'boot', 'update', 'restart'] as const;
export type ServiceStartOrigin = (typeof SERVICE_START_ORIGINS)[number];

export const NOTIFICATION_KINDS = [
  'limit',
  'risk_app',
  'check_in',
  'preventive',
  'restart',
  'protection_paused',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

type EventBase = {
  /** Identificador único, gerado pelo nativo. */
  readonly id: string;
  /** Instante em milissegundos desde a época Unix. */
  readonly at: number;
  /** Dia local do evento (AAAA-MM-DD), pela borda do dia do nativo. */
  readonly dayKey: string;
};

/**
 * Evento gravado pelo nativo (spec 03, seção 4.3). O JS importa de forma
 * idempotente e só então pede para apagá-lo.
 */
export type MonitoringEvent = EventBase &
  (
    | { readonly type: 'service_started'; readonly origin: ServiceStartOrigin }
    | {
        readonly type: 'limit_reached';
        readonly compulsionId: number;
        /** Só no app de risco, cujo limite é por app. */
        readonly targetId: TargetId | null;
      }
    | { readonly type: 'notification_sent'; readonly kind: NotificationKind }
    | {
        readonly type: 'interruption_shown';
        readonly compulsionId: number;
        readonly targetId: TargetId;
      }
    | {
        readonly type: 'interruption_response';
        /** O `id` do `interruption_shown` respondido. */
        readonly interruptionId: string;
        readonly compulsionId: number;
        readonly response: InterruptionResponse;
      }
    | {
        readonly type: 'day_failed';
        readonly compulsionId: number;
        readonly reason: DayFailureReason;
      }
    | {
        readonly type: 'check_in_answered';
        readonly compulsionId: number;
        readonly answer: CheckInAnswer;
      }
    | { readonly type: 'emergency_requested'; readonly source: 'interruption' | 'notification' }
    | { readonly type: 'permission_lost'; readonly permission: PermissionKind }
  );

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

  /** Envia a configuração (spec 03, 4.2). Substitui a anterior, que o nativo guarda em disco. */
  configure(config: MonitoringConfig): Promise<void>;
  /**
   * Eventos ainda não confirmados, do mais antigo ao mais novo. Os que vieram
   * malformados do nativo aparecem em `invalidIds`, para serem apagados também.
   */
  getPendingEvents(): Promise<{ events: MonitoringEvent[]; invalidIds: string[] }>;
  /** Apaga os eventos já importados. Ids desconhecidos são ignorados. */
  acknowledgeEvents(ids: readonly string[]): Promise<void>;
  /** "Apagar meus dados": para o monitoramento e apaga configuração, estado e eventos. */
  reset(): Promise<void>;
}
