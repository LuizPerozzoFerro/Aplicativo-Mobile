import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { dataChanges } from '@/data/changes';
import { startOfNextDay } from '@/domain/day';
import { getAppCatalogService } from '@/features/content/useCatalog';

import { reconcileMilestones } from './milestoneData';

/**
 * Enquanto as abas estão à vista, mantém os alcances de marco em dia e abre a
 * celebração quando houver alcance não celebrado (spec 04, 5.3): ao abrir o
 * app, ao voltar do segundo plano, à meia-noite e depois de cada gravação (uma
 * quebra importada do nativo, um catálogo novo). Fora das abas (onboarding,
 * emergência, outra tela por cima) não abre nada; ao voltar, confere de novo.
 */
export function useMilestoneCelebrations(): void {
  useFocusEffect(
    useCallback(() => {
      let busy = false;
      let opened = false;
      const check = () => {
        // A conferência grava, a gravação avisa `dataChanges` e chama de novo: só uma por vez.
        if (busy || opened) return;
        busy = true;
        try {
          const repositories = getRepositories();
          reconcileMilestones(repositories, getAppCatalogService().current().catalog, new Date());
          if (repositories.milestoneReaches.listPending().length > 0) {
            opened = true;
            router.push('/celebration');
          }
        } catch {
          // Falha aqui não pode derrubar o app: tenta de novo na próxima vez.
        } finally {
          busy = false;
        }
      };

      check();
      const unsubscribe = dataChanges.subscribe(check);
      const app = AppState.addEventListener('change', (state) => {
        if (state === 'active') check();
      });
      let timer: ReturnType<typeof setTimeout>;
      const scheduleMidnight = () => {
        timer = setTimeout(
          () => {
            check();
            scheduleMidnight();
          },
          startOfNextDay(new Date()).getTime() - Date.now(),
        );
      };
      scheduleMidnight();
      return () => {
        unsubscribe();
        app.remove();
        clearTimeout(timer);
      };
    }, []),
  );
}
