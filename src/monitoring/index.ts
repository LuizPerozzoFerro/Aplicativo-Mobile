import { getQuedoMonitoring } from '../../modules/monitoring-android';

import { AndroidMonitoringSync, type MonitoringSyncTarget } from './AndroidMonitoringSync';
import { FakeMonitoringModule } from './FakeMonitoringModule';
import type { MonitoringModule } from './types';

export * from './types';
export { FAKE_TARGETS, FakeMonitoringModule, type FakeEventInput } from './FakeMonitoringModule';
export { AndroidMonitoringSync, type MonitoringSyncTarget } from './AndroidMonitoringSync';
export { parseNativeEvents } from './events';

let current: MonitoringModule | null = null;
let currentSync: MonitoringSyncTarget | null = null;

/**
 * Ponto único de obtenção do monitoramento (spec 01, seção 4.8). Até o passo 7
 * da Fase 4 devolve o falso: as permissões reais mudam o onboarding e o
 * Início, e entram juntas. Configuração e eventos já são reais: ver
 * `getMonitoringSync`.
 */
export function getMonitoring(): MonitoringModule {
  current ??= new FakeMonitoringModule();
  return current;
}

/**
 * Configuração e eventos (spec 03, passo 2): o módulo nativo no Android, ou o
 * falso onde ele não existe (Jest, iOS até a Fase 10). Separado de
 * `getMonitoring` só até o passo 7, quando o nativo passa a responder por tudo.
 */
export function getMonitoringSync(): MonitoringSyncTarget {
  if (!currentSync) {
    const native = getQuedoMonitoring();
    currentSync = native ? new AndroidMonitoringSync(native) : getMonitoring();
  }
  return currentSync;
}
