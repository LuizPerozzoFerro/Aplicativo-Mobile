import type { QuedoMonitoringNativeModule } from '../../modules/monitoring-android';

import { parseNativeEvents } from './events';
import { MonitoringError, type MonitoringConfig, type MonitoringModule } from './types';

/** O que a sincronização (src/features/monitoring) usa do monitoramento. */
export type MonitoringSyncTarget = Pick<
  MonitoringModule,
  'configure' | 'getPendingEvents' | 'acknowledgeEvents' | 'reset'
>;

const ERR_INVALID_CONFIG = 'ERR_INVALID_CONFIG';

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

/**
 * Configuração e eventos pelo módulo nativo do Android (spec 03, 4.2 e 4.3).
 * A configuração vai como JSON e os eventos voltam como JSON, conferidos em
 * `parseNativeEvents` antes de chegar ao banco.
 */
export class AndroidMonitoringSync implements MonitoringSyncTarget {
  constructor(private readonly native: QuedoMonitoringNativeModule) {}

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
