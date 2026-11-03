import { getDayBounds } from '@/domain/day';

import {
  MonitoringError,
  PERMISSION_KINDS,
  UNSUPPORTED,
  asTargetId,
  type MonitoringEvent,
  type MonitoringModule,
  type MonitoringPlatform,
  type MonitoringTarget,
  type PermissionKind,
  type PermissionState,
  type PermissionStatus,
  type TargetId,
  type Unsupported,
  type UsageEntry,
  type UsageLimitConfig,
  type UsageLimitStatus,
  type UsageRule,
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
  private rules: readonly UsageRule[] | null = null;
  private usage: UsageSample[] = [];
  private events: MonitoringEvent[] = [];

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

  async startUsageLimit(config: UsageLimitConfig): Promise<void> {
    this.requirePermission('usageAccess');
    validateRules(config.rules);
    this.rules = config.rules;
  }

  async stopUsageLimit(): Promise<void> {
    this.rules = null;
  }

  async getUsageLimitStatus(): Promise<UsageLimitStatus> {
    return this.rules ? { active: true, rules: this.rules } : { active: false };
  }

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

  async getEvents(): Promise<MonitoringEvent[]> {
    return [...this.events];
  }

  async clearEvents(): Promise<void> {
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

  /**
   * Soma uso a um app. Se isso fizer uma regra ativa passar do limite pela
   * primeira vez no dia, grava `limit_reached`.
   */
  simulateUsage(targetId: TargetId, minutes: number): void {
    const at = this.now().getTime();
    const before = this.rules?.map((rule) => this.minutesToday(rule)) ?? [];
    this.usage.push({ targetId, milliseconds: minutes * MS_PER_MINUTE, at });
    this.rules?.forEach((rule, index) => {
      const crossed =
        (before[index] ?? 0) < rule.dailyLimitMinutes &&
        this.minutesToday(rule) >= rule.dailyLimitMinutes;
      if (crossed) this.record({ type: 'limit_reached', ruleId: rule.id, targetId });
    });
  }

  private record(event: Omit<MonitoringEvent, 'timestamp'>): void {
    this.events.push({ timestamp: this.now().getTime(), ...event });
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

  private minutesToday(rule: UsageRule): number {
    const milliseconds = this.samplesToday()
      .filter((sample) => rule.targetIds.includes(sample.targetId))
      .reduce((total, sample) => total + sample.milliseconds, 0);
    return milliseconds / MS_PER_MINUTE;
  }
}

function validateRules(rules: readonly UsageRule[]): void {
  const ids = new Set<string>();
  for (const rule of rules) {
    if (ids.has(rule.id)) {
      throw new MonitoringError('invalid_config', 'Regra de limite repetida');
    }
    ids.add(rule.id);
    if (rule.targetIds.length === 0) {
      throw new MonitoringError('invalid_config', 'Regra de limite sem apps');
    }
    if (!Number.isInteger(rule.dailyLimitMinutes) || rule.dailyLimitMinutes <= 0) {
      throw new MonitoringError('invalid_config', 'Limite diário precisa ser um inteiro positivo');
    }
  }
}
