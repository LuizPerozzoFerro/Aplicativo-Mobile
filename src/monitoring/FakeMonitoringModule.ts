import { getDayBounds, toDayKey } from '@/domain/day';

import {
  MONITORING_CONFIG_VERSION,
  MonitoringError,
  PERMISSION_KINDS,
  UNSUPPORTED,
  asTargetId,
  type MonitoringConfig,
  type MonitoringEvent,
  type MonitoringModule,
  type MonitoringPlatform,
  type MonitoringServiceStatus,
  type MonitoringTarget,
  type PermissionKind,
  type PermissionState,
  type PermissionStatus,
  type TargetId,
  type Unsupported,
  type UsageEntry,
} from './types';

// Implementação falsa (spec 01, seção 4.8): simula permissões, uso e eventos em
// memória, para as telas das próximas fases funcionarem sem o módulo nativo.
// Responde como cada plataforma responderia, inclusive os UNSUPPORTED do iOS.

/**
 * Apps simulados (CLAUDE.md, seção 9: nada impróprio). Os seis primeiros são os
 * sugeridos do onboarding (src/domain/suggestedApps.ts; spec 02, seção 4.4),
 * com nomes reais de apps populares, para a pré-marcação ser testável sem o
 * módulo nativo. Os de exemplo completam a lista com apps não sugeridos.
 */
// O lint trata `label` como texto visível. Aqui é o nome simulado de um app,
// que no aparelho vem do sistema e não se traduz.
/* eslint-disable no-restricted-syntax */
export const FAKE_TARGETS: readonly MonitoringTarget[] = [
  { id: asTargetId('com.instagram.android'), label: 'Instagram' },
  { id: asTargetId('com.zhiliaoapp.musically'), label: 'TikTok' },
  { id: asTargetId('com.google.android.youtube'), label: 'YouTube' },
  { id: asTargetId('com.kwai.video'), label: 'Kwai' },
  { id: asTargetId('com.twitter.android'), label: 'X' },
  { id: asTargetId('com.reddit.frontpage'), label: 'Reddit' },
  { id: asTargetId('com.example.clips'), label: 'Example Clips' },
  { id: asTargetId('com.example.feed'), label: 'Example Feed' },
  { id: asTargetId('com.example.forum'), label: 'Example Forum' },
  { id: asTargetId('com.example.notes'), label: 'Example Notes' },
];
/* eslint-enable no-restricted-syntax */

export type FakeMonitoringOptions = {
  platform?: MonitoringPlatform;
  /** Estado inicial; o que faltar começa negado (ou UNSUPPORTED, se a plataforma não tiver). */
  permissions?: Partial<PermissionStatus>;
  /** Se `requestPermission` concede (o usuário aceitou). Padrão: sim. */
  grantOnRequest?: boolean;
  targets?: readonly MonitoringTarget[];
  now?: () => Date;
};

type UsageSample = { targetId: TargetId; milliseconds: number; at: number };

/** Evento sem os campos que o nativo preenche (id, instante e dia). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type FakeEventInput = DistributiveOmit<MonitoringEvent, 'id' | 'at' | 'dayKey'>;

const UNSUPPORTED_PERMISSIONS: { readonly [P in MonitoringPlatform]: readonly PermissionKind[] } = {
  android: [],
  ios: ['overlay'],
};

const MS_PER_MINUTE = 60 * 1000;

export class FakeMonitoringModule implements MonitoringModule {
  readonly platform: MonitoringPlatform;

  private permissions: Record<PermissionKind, PermissionState>;
  private readonly grantOnRequest: boolean;
  private readonly targets: readonly MonitoringTarget[];
  private readonly now: () => Date;
  private service: MonitoringServiceStatus = {
    active: false,
    running: false,
    startRequestedAt: null,
    lastCheckAt: null,
  };
  private usage: UsageSample[] = [];
  private events: MonitoringEvent[] = [];
  private config: MonitoringConfig | null = null;
  private nextEventNumber = 1;

  constructor(options: FakeMonitoringOptions = {}) {
    this.platform = options.platform ?? 'android';
    this.grantOnRequest = options.grantOnRequest ?? true;
    this.targets = options.targets ?? FAKE_TARGETS;
    this.now = options.now ?? (() => new Date());
    const unsupported = UNSUPPORTED_PERMISSIONS[this.platform];
    this.permissions = Object.fromEntries(
      PERMISSION_KINDS.map((kind) => [
        kind,
        unsupported.includes(kind) ? UNSUPPORTED : (options.permissions?.[kind] ?? 'denied'),
      ]),
    ) as Record<PermissionKind, PermissionState>;
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return { ...this.permissions };
  }

  async requestPermission(kind: PermissionKind): Promise<PermissionState> {
    if (this.permissions[kind] !== UNSUPPORTED && this.grantOnRequest) {
      this.permissions[kind] = 'granted';
    }
    return this.permissions[kind];
  }

  async listTargets(): Promise<MonitoringTarget[] | Unsupported> {
    return this.platform === 'android' ? [...this.targets] : UNSUPPORTED;
  }

  async pickTargets(): Promise<MonitoringTarget[] | null | Unsupported> {
    // No iOS o seletor da Apple não dá o nome do app.
    return this.platform === 'ios'
      ? this.targets.map((target) => ({ id: target.id, label: null }))
      : UNSUPPORTED;
  }

  async startMonitoring(): Promise<void> {
    this.requirePermission('usageAccess');
    this.service = { ...this.service, active: true, running: true };
  }

  async stopMonitoring(): Promise<void> {
    this.service = { ...this.service, active: false, running: false };
  }

  async getServiceStatus(): Promise<MonitoringServiceStatus> {
    return { ...this.service };
  }

  /** No falso, a perda já é gravada em `simulatePermission`. */
  async checkProtection(): Promise<void> {}

  async getUsageToday(): Promise<UsageEntry[] | Unsupported> {
    if (this.platform === 'ios') return UNSUPPORTED;
    this.requirePermission('usageAccess');
    const totals = new Map<TargetId, number>();
    for (const sample of this.samplesToday()) {
      totals.set(sample.targetId, (totals.get(sample.targetId) ?? 0) + sample.milliseconds);
    }
    return [...totals].map(([targetId, milliseconds]) => ({ targetId, milliseconds }));
  }

  // Sem VPN na primeira versão (D6): a flag domainMonitoring é sempre falsa.
  async startDomainWatch(): Promise<Unsupported> {
    return UNSUPPORTED;
  }

  async stopDomainWatch(): Promise<Unsupported> {
    return UNSUPPORTED;
  }

  async configure(config: MonitoringConfig): Promise<void> {
    if (config.version !== MONITORING_CONFIG_VERSION) {
      throw new MonitoringError('invalid_config', 'Versão da configuração desconhecida');
    }
    this.config = config;
  }

  async getPendingEvents(): Promise<{ events: MonitoringEvent[]; invalidIds: string[] }> {
    return { events: [...this.events], invalidIds: [] };
  }

  async acknowledgeEvents(ids: readonly string[]): Promise<void> {
    this.events = this.events.filter((event) => !ids.includes(event.id));
  }

  async reset(): Promise<void> {
    this.service = { ...this.service, active: false, running: false };
    this.config = null;
    this.events = [];
  }

  // --- Simulação (só no falso, fora da interface) ---

  /**
   * Muda uma permissão por fora, como o usuário faria nos Ajustes. Perder uma
   * permissão concedida grava `permission_lost`, como fará o módulo nativo.
   */
  simulatePermission(kind: PermissionKind, state: Exclude<PermissionState, Unsupported>): void {
    if (this.permissions[kind] === UNSUPPORTED) return;
    if (this.permissions[kind] === 'granted' && state === 'denied') {
      this.record({ type: 'permission_lost', permission: kind });
    }
    this.permissions[kind] = state;
  }

  /** O serviço morreu sem ninguém pedir: continua "ligado", mas sem rodar. */
  simulateServiceStopped(): void {
    this.service = { ...this.service, running: false };
  }

  /** Soma uso a um app, para o `getUsageToday`. As regras do momento são do nativo (passo 3). */
  simulateUsage(targetId: TargetId, minutes: number): void {
    this.usage.push({ targetId, milliseconds: minutes * MS_PER_MINUTE, at: this.now().getTime() });
  }

  /** Grava um evento como o nativo gravaria, com id, instante e dia. Devolve o evento. */
  simulateEvent(input: FakeEventInput): MonitoringEvent {
    return this.record(input);
  }

  /** A última configuração recebida, ou nula. */
  getLastConfig(): MonitoringConfig | null {
    return this.config;
  }

  private record(input: FakeEventInput): MonitoringEvent {
    const now = this.now();
    const event = {
      ...input,
      id: `fake-${this.nextEventNumber++}`,
      at: now.getTime(),
      dayKey: toDayKey(now),
    } as MonitoringEvent;
    this.events.push(event);
    return event;
  }

  private requirePermission(kind: PermissionKind): void {
    if (this.permissions[kind] !== 'granted') {
      throw new MonitoringError('permission_required', `Permissão necessária: ${kind}`);
    }
  }

  private samplesToday(): UsageSample[] {
    const { start, end } = getDayBounds(this.now());
    return this.usage.filter((sample) => sample.at >= start.getTime() && sample.at < end.getTime());
  }
}
