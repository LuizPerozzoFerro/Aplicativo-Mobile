import { FakeMonitoringModule } from './FakeMonitoringModule';
import type { MonitoringModule } from './types';

export * from './types';
export { FAKE_TARGETS, FakeMonitoringModule } from './FakeMonitoringModule';

let current: MonitoringModule | null = null;

/**
 * Ponto único de obtenção do monitoramento (spec 01, seção 4.8). Nesta fase
 * sempre devolve o falso; na Fase 4, o módulo nativo no Android.
 */
export function getMonitoring(): MonitoringModule {
  current ??= new FakeMonitoringModule();
  return current;
}
