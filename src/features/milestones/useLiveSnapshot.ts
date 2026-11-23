import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dataChanges } from '@/data/changes';
import { startOfNextDay } from '@/domain/day';

/**
 * Dados de uma tela lidos de novo ao ganhar o foco, ao voltar do segundo
 * plano, à meia-noite e depois de cada gravação no banco (como o Início).
 * `load` recebe o "agora" da leitura.
 */
export function useLiveSnapshot<T>(load: (now: Date) => T): { now: Date; data: T } {
  const read = useCallback(() => {
    const now = new Date();
    return { now, data: load(now) };
  }, [load]);
  const [snapshot, setSnapshot] = useState(read);
  const refresh = useCallback(() => setSnapshot(read()), [read]);

  useFocusEffect(refresh);

  useEffect(() => dataChanges.subscribe(refresh), [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(refresh, startOfNextDay(snapshot.now).getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [snapshot.now, refresh]);

  return snapshot;
}
