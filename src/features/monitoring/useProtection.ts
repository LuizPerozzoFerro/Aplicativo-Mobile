import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import {
  getProtectionIssues,
  getProtectionNeeds,
  getServiceSituation,
  type ProtectionIssue,
  type ServiceSituation,
} from '@/domain/protection';
import { getMonitoring, type MonitoringServiceStatus, type PermissionStatus } from '@/monitoring';

import { buildUsageRules } from './config';
import { getAppMonitoringSync } from './useMonitoringSync';

export type Protection = {
  readonly permissions: PermissionStatus;
  readonly service: MonitoringServiceStatus;
  readonly situation: ServiceSituation;
  readonly issues: readonly ProtectionIssue[];
};

/** Sincroniza antes de ler: ao abrir, o serviço pode estar para ser religado. */
async function readProtection(): Promise<Protection> {
  await getAppMonitoringSync().sync();
  const monitoring = getMonitoring();
  const [permissions, service] = await Promise.all([
    monitoring.getPermissionStatus(),
    monitoring.getServiceStatus(),
  ]);
  const now = new Date();
  const needs = getProtectionNeeds(buildUsageRules(getRepositories(), now));
  const at = now.getTime();
  return {
    permissions,
    service,
    situation: getServiceSituation(needs, permissions, service, at),
    issues: getProtectionIssues(needs, permissions, service, at),
  };
}

/**
 * Estado do monitoramento para as telas (spec 03, 5.7): lido ao ganhar o foco
 * e ao voltar do segundo plano, que é quando uma permissão pode ter mudado.
 * Nulo enquanto a primeira leitura não termina.
 */
export function useProtection(): { protection: Protection | null; refresh: () => void } {
  const [protection, setProtection] = useState<Protection | null>(null);
  const latest = useRef(0);

  const refresh = useCallback(() => {
    latest.current += 1;
    const request = latest.current;
    void readProtection().then((value) => {
      if (request === latest.current) setProtection(value);
    });
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { protection, refresh };
}
