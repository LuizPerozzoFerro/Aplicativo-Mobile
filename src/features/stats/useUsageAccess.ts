import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getMonitoring, type PermissionState } from '@/monitoring';

/**
 * Estado do acesso ao uso, lido ao ganhar o foco e ao voltar do segundo plano
 * (quando ele pode ter mudado). Nulo enquanto a primeira leitura não termina.
 * Só lê: não sincroniza nem grava nada.
 */
export function useUsageAccess(): PermissionState | null {
  const [state, setState] = useState<PermissionState | null>(null);

  const read = useCallback(() => {
    let active = true;
    void getMonitoring()
      .getPermissionStatus()
      .then((status) => {
        if (active) setState(status.usageAccess);
      });
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(read);

  useEffect(() => {
    let cancel: (() => void) | null = null;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        cancel?.();
        cancel = read();
      }
    });
    return () => {
      cancel?.();
      subscription.remove();
    };
  }, [read]);

  return state;
}
