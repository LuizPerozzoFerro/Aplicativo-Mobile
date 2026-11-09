import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import {
  getNewlyGrantedPermissions,
  getProtectionIssues,
  getProtectionNeeds,
  getProtectionNotice,
  getServiceSituation,
  type PermissionHistory,
  type ProtectionIssue,
  type ProtectionNotice,
  type ServiceSituation,
} from '@/domain/protection';
import { getMonitoring, type MonitoringServiceStatus, type PermissionStatus } from '@/monitoring';

import { buildUsageRules } from './config';
import { getAppMonitoringSync } from './useMonitoringSync';

export type Protection = {
  readonly permissions: PermissionStatus;
  readonly service: MonitoringServiceStatus;
  readonly situation: ServiceSituation;
  /** Tudo o que falta, mesmo com o aviso adiado: a tela de estado sempre mostra. */
  readonly issues: readonly ProtectionIssue[];
  /** Aviso do Início; nulo quando não há o que mostrar. */
  readonly notice: ProtectionNotice | null;
};

/** Sincroniza antes de ler: ao abrir, o serviço pode estar para ser religado. */
async function readProtection(): Promise<Protection> {
  await getAppMonitoringSync().sync();
  const monitoring = getMonitoring();
  const [permissions, service] = await Promise.all([
    monitoring.getPermissionStatus(),
    monitoring.getServiceStatus(),
  ]);
  const repositories = getRepositories();
  const settings = repositories.settings.get();
  const history: PermissionHistory = {
    usageAccess: settings.usageAccessGrantedOnce,
    notifications: settings.notificationsGrantedOnce,
    overlay: settings.overlayGrantedOnce,
  };
  // Grava só o que é novo: toda gravação no banco dispara uma sincronização.
  const newlyGranted = getNewlyGrantedPermissions(permissions, history);
  if (newlyGranted.length > 0) repositories.settings.markPermissionsGranted(newlyGranted);

  const now = new Date();
  const needs = getProtectionNeeds(buildUsageRules(repositories, now));
  const at = now.getTime();
  const issues = getProtectionIssues(needs, permissions, service, at);
  return {
    permissions,
    service,
    situation: getServiceSituation(needs, permissions, service, at),
    issues,
    notice: getProtectionNotice(
      issues,
      history,
      settings.protectionNoticeDismissedAt?.getTime() ?? null,
      at,
    ),
  };
}

/**
 * Estado do monitoramento para as telas (spec 03, 5.7): lido ao ganhar o foco
 * e ao voltar do segundo plano, que é quando uma permissão pode ter mudado.
 * Nulo enquanto a primeira leitura não termina.
 */
export function useProtection(): {
  protection: Protection | null;
  refresh: () => void;
  dismissNotice: () => void;
} {
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

  const dismissNotice = useCallback(() => {
    getRepositories().settings.setProtectionNoticeDismissedAt(new Date());
    refresh();
  }, [refresh]);

  return { protection, refresh, dismissNotice };
}
