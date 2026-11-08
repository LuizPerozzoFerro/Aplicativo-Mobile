// Lado JavaScript do módulo nativo de monitoramento do Android (spec 03,
// seção 5.1). Só os tipos e o acesso ao módulo: quem usa é `src/monitoring/`,
// atrás da interface comum. Fora do Android (e no Jest), o módulo não existe
// e `getQuedoMonitoring()` devolve nulo.
import { requireOptionalNativeModule } from 'expo';

export type NativePermissionState = 'granted' | 'denied';

export type NativePermissionStatus = {
  readonly usageAccess: NativePermissionState;
  readonly notifications: NativePermissionState;
  readonly overlay: NativePermissionState;
};

export type NativeTarget = { readonly id: string; readonly label: string };

export type NativeUsageEntry = { readonly targetId: string; readonly milliseconds: number };

export type NativeBootResult = 'started' | 'inactive' | 'no_usage_access' | 'failed';

/** Estado do serviço em disco (`MonitoringState.snapshot`). Instantes em ms desde a época Unix. */
export type NativeServiceStatus = {
  readonly active: boolean;
  readonly running: boolean;
  readonly serviceStarts: number;
  readonly serviceStartedAt: number | null;
  readonly checks: number;
  readonly lastCheckAt: number | null;
  readonly lastBootAt: number | null;
  readonly lastBootResult: NativeBootResult | null;
  /** Eventos gravados e ainda não confirmados pelo JS. */
  readonly pendingEvents: number;
};

/** O que `getMomentStatus` devolve em JSON (`MomentRunner.statusJson`). */
export type NativeMomentStatus = {
  readonly rules: {
    readonly dayKey: string | null;
    readonly compulsions: Readonly<
      Record<
        string,
        { readonly interruptions: number; readonly continues: number; readonly stopped: boolean }
      >
    >;
  };
  readonly usage: Readonly<Record<string, number>>;
  readonly foreground: string | null;
  readonly lastShow: {
    readonly at: number;
    readonly compulsionId: number;
    readonly target: string;
  } | null;
  readonly testLimitMinutes: number | null;
};

/** Código do erro quando falta o acesso ao uso (`UsageAccessRequiredException`). */
export const ERR_PERMISSION_REQUIRED = 'ERR_PERMISSION_REQUIRED';

export type QuedoMonitoringNativeModule = {
  getPermissionStatus(): NativePermissionStatus;
  /** Abrem os Ajustes; `false` se o aparelho não tiver a tela. */
  openUsageAccessSettings(): Promise<boolean>;
  openOverlaySettings(): Promise<boolean>;
  openNotificationSettings(): Promise<boolean>;
  listTargets(): Promise<NativeTarget[]>;
  /** Falha com ERR_PERMISSION_REQUIRED sem o acesso ao uso. */
  getUsageToday(): Promise<NativeUsageEntry[]>;
  /** Falha com ERR_PERMISSION_REQUIRED sem o acesso ao uso. */
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  getServiceStatus(): NativeServiceStatus;
  /** Configuração em JSON (`MonitoringConfig`). Falha com ERR_INVALID_CONFIG se o nativo recusar. */
  configure(json: string): Promise<void>;
  /** Configuração guardada, em JSON, ou nulo. Para a tela de desenvolvimento. */
  getConfig(): string | null;
  /** Estado das regras de hoje, em JSON (`NativeMomentStatus`). Só para a tela de desenvolvimento. */
  getMomentStatus(): string;
  /** Todos os limites com este valor, ou os reais com nulo. Só tem efeito em build depurável. */
  setTestLimit(minutes: number | null): void;
  /** Eventos ainda não confirmados, em JSON (lista). */
  getPendingEvents(): Promise<string>;
  acknowledgeEvents(ids: string[]): Promise<void>;
  /** Para o serviço e apaga configuração, estado e eventos. */
  reset(): Promise<void>;
};

let cached: QuedoMonitoringNativeModule | null | undefined;

export function getQuedoMonitoring(): QuedoMonitoringNativeModule | null {
  if (cached === undefined) {
    cached = requireOptionalNativeModule<QuedoMonitoringNativeModule>('QuedoMonitoring');
  }
  return cached;
}
