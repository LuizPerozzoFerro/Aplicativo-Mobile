import { getQuedoMonitoring } from '../../modules/monitoring-android';

import { AndroidMonitoringModule } from './AndroidMonitoringModule';
import { FakeMonitoringModule } from './FakeMonitoringModule';
import type { MonitoringModule } from './types';

export * from './types';
export { FAKE_TARGETS, FakeMonitoringModule, type FakeEventInput } from './FakeMonitoringModule';
export { AndroidMonitoringModule } from './AndroidMonitoringModule';
export { parseNativeEvents } from './events';

let current: MonitoringModule | null = null;

/**
 * Ponto único de obtenção do monitoramento (spec 01, seção 4.8): o módulo
 * nativo no Android, ou o falso onde ele não existe (Jest, iOS até a Fase 10).
 */
export function getMonitoring(): MonitoringModule {
  if (!current) {
    const native = getQuedoMonitoring();
    current = native ? new AndroidMonitoringModule(native) : new FakeMonitoringModule();
  }
  return current;
}
