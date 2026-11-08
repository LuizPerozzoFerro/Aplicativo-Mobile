import { PermissionsAndroid } from 'react-native';

import type {
  NativePermissionStatus,
  QuedoMonitoringNativeModule,
} from '../../modules/monitoring-android';

import { parseNativeEvents } from './events';
import {
  MonitoringError,
  UNSUPPORTED,
  asTargetId,
  type MonitoringConfig,
  type MonitoringModule,
  type MonitoringServiceStatus,
  type MonitoringTarget,
  type PermissionKind,
  type PermissionState,
  type PermissionStatus,
  type Unsupported,
  type UsageEntry,
} from './types';

const ERR_INVALID_CONFIG = 'ERR_INVALID_CONFIG';
const ERR_PERMISSION_REQUIRED = 'ERR_PERMISSION_REQUIRED';

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/** Troca o erro do nativo pelo erro explícito da interface. */
async function withPermissionError<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (hasCode(error, ERR_PERMISSION_REQUIRED)) {
      throw new MonitoringError('permission_required', 'Acesso ao uso necessário');
    }
    throw error;
  }
}

/**
 * O monitoramento real do Android (spec 03, 5.1 e 5.7), sobre o módulo em
 * Kotlin. A configuração vai como JSON e os eventos voltam como JSON,
 * conferidos em `parseNativeEvents` antes de chegar ao banco.
 */
export class AndroidMonitoringModule implements MonitoringModule {
  readonly platform = 'android' as const;

  constructor(private readonly native: QuedoMonitoringNativeModule) {}

  private status(): NativePermissionStatus {
    return this.native.getPermissionStatus();
  }

  async getPermissionStatus(): Promise<PermissionStatus> {
    return this.status();
  }

  async requestPermission(kind: PermissionKind): Promise<PermissionState> {
    switch (kind) {
      case 'usageAccess':
        await this.native.openUsageAccessSettings();
        break;
      case 'overlay':
        await this.native.openOverlaySettings();
        break;
      case 'notifications':
        await this.requestNotifications();
        break;
    }
    return this.status()[kind];
  }

  /**
   * Janela do sistema (Android 13+). Se o usuário já recusou de vez ou desligou
   * as notificações nos Ajustes, a janela não muda nada: só a tela dos Ajustes.
   */
  private async requestNotifications(): Promise<void> {
    const { PERMISSIONS, RESULTS } = PermissionsAndroid;
    const result = await PermissionsAndroid.request(PERMISSIONS.POST_NOTIFICATIONS);
    const onlyInSettings =
      result === RESULTS.NEVER_ASK_AGAIN ||
      (result === RESULTS.GRANTED && this.status().notifications === 'denied');
    if (onlyInSettings) await this.native.openNotificationSettings();
  }

  async listTargets(): Promise<MonitoringTarget[]> {
    const targets = await this.native.listTargets();
    return targets.map((target) => ({ id: asTargetId(target.id), label: target.label }));
  }

  async pickTargets(): Promise<Unsupported> {
    return UNSUPPORTED;
  }

  async getUsageToday(): Promise<UsageEntry[]> {
    const entries = await withPermissionError(() => this.native.getUsageToday());
    return entries.map((entry) => ({
      targetId: asTargetId(entry.targetId),
      milliseconds: entry.milliseconds,
    }));
  }

  async startMonitoring(): Promise<void> {
    await withPermissionError(() => this.native.startMonitoring());
  }

  async stopMonitoring(): Promise<void> {
    await this.native.stopMonitoring();
  }

  async getServiceStatus(): Promise<MonitoringServiceStatus> {
    const { active, running, startRequestedAt, lastCheckAt } = this.native.getServiceStatus();
    return { active, running, startRequestedAt, lastCheckAt };
  }

  async checkProtection(): Promise<void> {
    await this.native.checkProtection();
  }

  // Sem VPN na primeira versão (D6).
  async startDomainWatch(): Promise<Unsupported> {
    return UNSUPPORTED;
  }

  async stopDomainWatch(): Promise<Unsupported> {
    return UNSUPPORTED;
  }

  async configure(config: MonitoringConfig): Promise<void> {
    try {
      await this.native.configure(JSON.stringify(config));
    } catch (error) {
      if (hasCode(error, ERR_INVALID_CONFIG)) {
        throw new MonitoringError('invalid_config', 'Configuração recusada pelo nativo');
      }
      throw error;
    }
  }

  async getPendingEvents() {
    let raw: unknown;
    try {
      raw = JSON.parse(await this.native.getPendingEvents());
    } catch {
      raw = [];
    }
    return parseNativeEvents(raw);
  }

  async acknowledgeEvents(ids: readonly string[]): Promise<void> {
    if (ids.length > 0) await this.native.acknowledgeEvents([...ids]);
  }

  async reset(): Promise<void> {
    await this.native.reset();
  }
}
