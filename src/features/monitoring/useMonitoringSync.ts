import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { dataChanges } from '@/data/changes';
import { getMonitoring, type MonitoringTexts } from '@/monitoring';

import { createMonitoringSync, type MonitoringSync } from './monitoringSync';

/** Junta as gravações de uma mesma ação (ex.: concluir o onboarding) numa rodada só. */
const CHANGE_DEBOUNCE_MS = 300;

let shared: MonitoringSync | null = null;
let currentTexts: MonitoringTexts | null = null;

/**
 * A sincronização do app, a mesma para quem chamar. Os textos vêm do último
 * `useMonitoringSync` montado (o i18n do JS, spec 03, 4.2).
 */
export function getAppMonitoringSync(): MonitoringSync {
  shared ??= createMonitoringSync({
    repositories: getRepositories,
    target: () => getMonitoring(),
    texts: () => {
      if (!currentTexts) throw new Error('Textos do monitoramento ainda não carregados');
      return currentTexts;
    },
    isForeground: () => AppState.currentState === 'active',
    links: () => ({
      permissions: Linking.createURL('/permission-status'),
      emergencyFromNotification: Linking.createURL('/emergency', {
        queryParams: { source: 'notification' },
      }),
      emergencyFromInterruption: Linking.createURL('/emergency', {
        queryParams: { source: 'interruption' },
      }),
    }),
  });
  return shared;
}

/**
 * Mantém o nativo em dia (spec 03, 4.2 e 4.3): sincroniza ao abrir o app, ao
 * voltar do segundo plano e depois de cada gravação no banco. Montar uma vez,
 * no layout raiz, depois de o banco estar pronto.
 */
export function useMonitoringSync(): void {
  const { t } = useTranslation('monitoring');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Antes do efeito da sincronização: os efeitos rodam na ordem em que aparecem.
  useEffect(() => {
    currentTexts = {
      channels: {
        tracking: t('channels.tracking'),
        alerts: t('channels.alerts'),
        reminders: t('channels.reminders'),
      },
      ongoing: { title: t('ongoing.title'), text: t('ongoing.text') },
      notifications: {
        public: { title: t('notifications.public.title'), text: t('notifications.public.text') },
        emergencyAction: t('notifications.emergencyAction'),
        limit: { title: t('notifications.limit.title'), text: t('notifications.limit.text') },
        riskApp: { title: t('notifications.riskApp.title'), text: t('notifications.riskApp.text') },
        checkIn: {
          title: t('notifications.checkIn.title'),
          text: t('notifications.checkIn.text'),
          noRelapse: t('notifications.checkIn.noRelapse'),
          relapse: t('notifications.checkIn.relapse'),
        },
        preventive: {
          title: t('notifications.preventive.title'),
          generic: t('notifications.preventive.generic'),
          withMotivation: t('notifications.preventive.withMotivation'),
          byEmotion: {
            boredom: t('notifications.preventive.byEmotion.boredom'),
            loneliness: t('notifications.preventive.byEmotion.loneliness'),
            stress: t('notifications.preventive.byEmotion.stress'),
            anxiety: t('notifications.preventive.byEmotion.anxiety'),
            tiredness: t('notifications.preventive.byEmotion.tiredness'),
            sadness: t('notifications.preventive.byEmotion.sadness'),
          },
        },
        restart: { title: t('notifications.restart.title'), text: t('notifications.restart.text') },
        protectionPaused: {
          title: t('notifications.protectionPaused.title'),
          text: t('notifications.protectionPaused.text'),
        },
      },
      interruption: {
        brand: t('interruption.brand'),
        title: t('interruption.title'),
        phrases: [
          t('interruption.phrases.breathe'),
          t('interruption.phrases.choice'),
          t('interruption.phrases.pause'),
          t('interruption.phrases.care'),
        ],
        motivationLabel: t('interruption.motivationLabel'),
        emergency: t('interruption.emergency'),
        home: t('interruption.home'),
        continue: t('interruption.continue'),
        ignoreToday: t('interruption.ignoreToday'),
        endOfDayWarning: t('interruption.endOfDayWarning'),
      },
    };
  }, [t]);

  useEffect(() => {
    const sync = getAppMonitoringSync();
    void sync.sync();

    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync.sync();
    });
    const unsubscribe = dataChanges.subscribe(() => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void sync.sync(), CHANGE_DEBOUNCE_MS);
    });
    return () => {
      app.remove();
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
