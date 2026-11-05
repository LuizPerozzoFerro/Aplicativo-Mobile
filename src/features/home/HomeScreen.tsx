import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { startOfNextDay } from '@/domain/day';
import { EmptyState, Screen, Text } from '@/ui';

import { AbstinenceCard } from './AbstinenceCard';
import { loadHomeCards } from './homeCards';
import { ModerationCard } from './ModerationCard';

function load() {
  const now = new Date();
  return { now, cards: loadHomeCards(getRepositories(), now) };
}

/**
 * Tela Início (spec 02, seção 4.5; doc 01, seção 6.1). Recarrega ao ganhar o
 * foco (volta do Perfil ou das permissões), ao voltar do segundo plano e à
 * meia-noite, para a streak e o check-in seguirem o dia. Tocar no card ainda
 * não leva a outra tela (aba Progresso, Fase 5).
 */
export function HomeScreen() {
  const { t } = useTranslation(['home', 'tabs']);
  const [snapshot, setSnapshot] = useState(load);
  const refresh = useCallback(() => setSnapshot(load()), []);

  useFocusEffect(refresh);

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

  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('tabs:home')}</Text>
      {/* O botão de emergência (Fase 4) entra aqui, acima dos cards, sempre visível. */}
      {snapshot.cards.length === 0 ? (
        <EmptyState
          testID="home-empty"
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onPress: () => router.navigate('/profile') }}
        />
      ) : (
        snapshot.cards.map((card) =>
          card.kind === 'abstinence' ? (
            <AbstinenceCard
              key={card.compulsion.id}
              compulsion={card.compulsion}
              overview={card.overview}
              onChange={refresh}
            />
          ) : (
            <ModerationCard
              key={card.compulsion.id}
              overview={card.overview}
              packageNames={card.packageNames}
              dailyLimitMinutes={card.dailyLimitMinutes}
              loadedAt={snapshot.now}
            />
          ),
        )
      )}
    </Screen>
  );
}
