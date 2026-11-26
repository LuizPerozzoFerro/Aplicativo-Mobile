import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { getAppMonitoringSync } from '@/features/monitoring/useMonitoringSync';
import { getMonitoring } from '@/monitoring';

import { createUsageHistorySync, type UsageHistorySync } from './usageHistorySync';

let shared: UsageHistorySync | null = null;

export function getAppUsageHistorySync(): UsageHistorySync {
  shared ??= createUsageHistorySync({
    repositories: getRepositories,
    target: () => getMonitoring(),
  });
  return shared;
}

/**
 * Histórico de uso (spec 04, 4.4): ao abrir o app e ao voltar do segundo
 * plano, depois da sincronização do monitoramento, que importa as telas de
 * interrupção usadas no desconto. Montar uma vez, no layout raiz.
 */
export function useUsageHistorySync(): void {
  useEffect(() => {
    const run = () =>
      void getAppMonitoringSync()
        .sync()
        .then(() => getAppUsageHistorySync().sync());
    run();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => app.remove();
  }, []);
}
