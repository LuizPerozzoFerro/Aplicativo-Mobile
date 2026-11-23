import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { CompulsionType } from '@/domain/compulsion';
import { getAppCatalogService } from '@/features/content/useCatalog';
import { Button, ListItem, Screen, Text, useTheme } from '@/ui';

import { loadCelebrations, type Celebration } from './milestoneData';

/** Até este número, um por vez; acima, um resumo (spec 04, 5.3). */
const MAX_ONE_BY_ONE = 2;

function openDetail(item: Celebration): void {
  router.replace({
    pathname: '/milestone',
    params: { compulsion: item.compulsionType, day: String(item.day) },
  });
}

/** Leva o foco do leitor de tela ao título quando ele aparece (5.3). */
function useInitialFocus(key: unknown) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
  }, [key]);
  return ref;
}

/**
 * Celebração de marco (spec 04, 5.3): cada alcance ainda não celebrado, um por
 * vez, ou um resumo com mais de dois. Mostrar já conta como celebrado: voltar
 * pelo sistema não faz a mesma celebração aparecer de novo.
 */
export function CelebrationScreen() {
  const { t } = useTranslation(['progress', 'common']);
  const theme = useTheme();
  const [items] = useState(() =>
    loadCelebrations(getRepositories(), getAppCatalogService().current().catalog),
  );
  const [index, setIndex] = useState(0);
  const summary = items.length > MAX_ONE_BY_ONE;
  const current = items[index];
  const titleRef = useInitialFocus(summary ? 'summary' : index);

  const names = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;

  useEffect(() => {
    const shown = summary ? items : current ? [current] : [];
    if (shown.length > 0) {
      getRepositories().milestoneReaches.markCelebrated(shown.map((item) => item.reachId));
    }
  }, [items, current, summary]);

  useEffect(() => {
    if (items.length === 0 && router.canGoBack()) router.back();
  }, [items]);

  const close = () => {
    if (!summary && index + 1 < items.length) setIndex(index + 1);
    else router.back();
  };

  if (summary) {
    return (
      <Screen testID="celebration-summary">
        <View ref={titleRef} accessible accessibilityRole="header">
          <Text variant="title">{t('celebration.summary', { count: items.length })}</Text>
        </View>
        <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
          {items.map((item) => (
            <ListItem
              key={item.reachId}
              title={t('celebration.summaryItem', {
                compulsion: names[item.compulsionType],
                days: t('days', { count: item.day }),
              })}
              subtitle={item.title ?? undefined}
              onPress={item.title === null ? undefined : () => openDetail(item)}
            />
          ))}
        </View>
        <Button label={t('celebration.close')} onPress={close} />
      </Screen>
    );
  }

  if (current === undefined) return <Screen>{null}</Screen>;
  return (
    <Screen testID="celebration">
      <Text color="textMuted">{names[current.compulsionType]}</Text>
      <View ref={titleRef} accessible accessibilityRole="header">
        <Text variant="title">
          {current.again
            ? t('celebration.again', { count: current.day })
            : t('celebration.reached', { count: current.day })}
        </Text>
      </View>
      {current.title === null ? null : <Text variant="heading">{current.title}</Text>}
      <View style={{ gap: theme.spacing.sm }}>
        {current.title === null ? null : (
          <Button label={t('celebration.view')} onPress={() => openDetail(current)} />
        )}
        <Button label={t('celebration.close')} variant="secondary" onPress={close} />
      </View>
    </Screen>
  );
}
