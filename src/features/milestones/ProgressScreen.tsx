import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { isCompulsionType, type CompulsionType } from '@/domain/compulsion';
import type { TimelineItem } from '@/domain/milestones';
import { getAppCatalogService } from '@/features/content/useCatalog';
import { Card, ChipGroup, EmptyState, ListItem, Screen, Text, useTheme } from '@/ui';

import { loadProgress, type CompulsionProgress } from './milestoneData';
import { useLiveSnapshot } from './useLiveSnapshot';

/** Abre o detalhe de um marco (5.4). */
export function openMilestone(type: CompulsionType, day: number): void {
  router.push({ pathname: '/milestone', params: { compulsion: type, day: String(day) } });
}

/**
 * Aba Progresso (spec 04, 5.4): filtro por compulsão (com mais de uma ativa),
 * streak, próximo marco e a linha do tempo dos marcos do catálogo. O card do
 * Início abre a aba já filtrada: o filtro é o parâmetro `compulsion` da rota,
 * que o card e os chips trocam.
 */
export function ProgressScreen() {
  const { t } = useTranslation(['progress', 'tabs', 'common']);
  const params = useLocalSearchParams<{ compulsion?: string }>();
  const load = useCallback(
    (now: Date) => loadProgress(getRepositories(), getAppCatalogService().current().catalog, now),
    [],
  );
  const { data: items } = useLiveSnapshot(load);
  const chosen = isCompulsionType(params.compulsion) ? params.compulsion : null;

  const names = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;

  const selected = items.find((item) => item.compulsion.type === chosen) ?? items[0] ?? null;

  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('tabs:progress')}</Text>
      {selected === null ? (
        <EmptyState
          testID="progress-empty"
          title={t('tabs:empty.progress.title')}
          description={t('tabs:empty.progress.description')}
        />
      ) : (
        <>
          {items.length > 1 ? (
            <ChipGroup
              testID="progress-filter"
              label={t('filterLabel')}
              mode="single"
              options={items.map((item) => ({
                value: item.compulsion.type,
                label: names[item.compulsion.type],
              }))}
              selected={[selected.compulsion.type]}
              onChange={([type]) => {
                if (type !== undefined) router.setParams({ compulsion: type });
              }}
            />
          ) : null}
          <ProgressHeader progress={selected} name={names[selected.compulsion.type]} />
          {selected.hasContent ? (
            <Timeline progress={selected} />
          ) : (
            <EmptyState
              testID="progress-no-content"
              title={t('noContent.title')}
              description={t('noContent.description')}
            />
          )}
        </>
      )}
    </Screen>
  );
}

function ProgressHeader({ progress, name }: { progress: CompulsionProgress; name: string }) {
  const { t } = useTranslation('progress');
  const theme = useTheme();
  const { streakDays, nextMilestone } = progress;
  return (
    <Card testID={`progress-header-${progress.compulsion.type}`}>
      <Text variant="heading">{name}</Text>
      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="display">{t('days', { count: streakDays })}</Text>
        {nextMilestone === null ? (
          <Text>{t('allDone')}</Text>
        ) : (
          <>
            <Text>{t('next', { count: nextMilestone })}</Text>
            <Text color="textMuted">{t('remaining', { count: nextMilestone - streakDays })}</Text>
          </>
        )}
      </View>
    </Card>
  );
}

function Timeline({ progress }: { progress: CompulsionProgress }) {
  const { t } = useTranslation('progress');
  const theme = useTheme();

  const statusText = (item: TimelineItem) => {
    if (item.status === 'reached') return t('status.reached');
    if (item.status === 'next') {
      return item.unlocked ? t('status.nextReachedBefore') : t('status.next');
    }
    return item.unlocked ? t('status.reachedBefore') : t('status.future');
  };

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="heading" accessibilityRole="header">
        {t('timeline')}
      </Text>
      <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        {progress.timeline.map((item) => {
          const days = t('days', { count: item.day });
          const status = statusText(item);
          const milestone = item.milestone;
          return (
            <ListItem
              key={item.day}
              testID={`progress-milestone-${item.day}`}
              title={days}
              subtitle={
                milestone === null ? status : t('itemSubtitle', { title: milestone.title, status })
              }
              onPress={
                milestone === null
                  ? undefined
                  : () => openMilestone(progress.compulsion.type, item.day)
              }
            />
          );
        })}
      </View>
    </View>
  );
}
