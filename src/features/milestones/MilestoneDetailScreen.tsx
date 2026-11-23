import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { CompulsionType } from '@/domain/compulsion';
import { getAppCatalogService } from '@/features/content/useCatalog';
import { Button, EmptyState, ListItem, Screen, Text, useTheme } from '@/ui';

import { loadMilestoneDetail } from './milestoneData';
import { useLiveSnapshot } from './useLiveSnapshot';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/**
 * Detalhe de um marco (spec 04, 5.4): dia, título, resumo, texto do benefício,
 * referências (abrem no navegador do aparelho), o aviso de que o conteúdo não
 * substitui acompanhamento profissional e o vídeo: desbloqueado, botão para
 * assistir (5.6); ainda não, "Disponível ao chegar a N dias", sem mostrar o
 * vídeo; marco sem vídeo, nenhum espaço vazio.
 */
export function MilestoneDetailScreen({
  type,
  day,
}: {
  type: CompulsionType | null;
  day: number | null;
}) {
  const { t } = useTranslation(['progress', 'common']);
  const theme = useTheme();
  const load = useCallback(
    (now: Date) =>
      type === null || day === null
        ? null
        : loadMilestoneDetail(
            getRepositories(),
            getAppCatalogService().current().catalog,
            type,
            day,
            now,
          ),
    [type, day],
  );
  const { data: detail } = useLiveSnapshot(load);
  const back = (
    <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
  );

  if (detail === null) {
    return (
      <Screen>
        <EmptyState
          testID="milestone-not-found"
          title={t('detail.notFound.title')}
          description={t('detail.notFound.description')}
        />
        {back}
      </Screen>
    );
  }

  const { milestone, unlocked } = detail;
  return (
    <Screen testID="milestone-detail">
      <View style={{ gap: theme.spacing.xs }}>
        <Text color="textMuted">{t('days', { count: milestone.day })}</Text>
        <Text variant="title" accessibilityRole="header">
          {milestone.title}
        </Text>
      </View>
      <Text variant="bodyStrong">{milestone.summary}</Text>
      <Text>{milestone.body}</Text>
      {milestone.video === null ? null : (
        <View style={{ gap: theme.spacing.xs }} testID="milestone-video">
          <Text variant="heading" accessibilityRole="header">
            {t('detail.video')}
          </Text>
          {unlocked ? (
            <Button
              testID="milestone-watch"
              label={t('detail.watch')}
              onPress={() =>
                router.push({
                  pathname: '/video',
                  params: { compulsion: detail.compulsion.type, day: String(milestone.day) },
                })
              }
            />
          ) : (
            <Text color="textMuted">{t('detail.videoLocked', { count: milestone.day })}</Text>
          )}
        </View>
      )}
      {milestone.references.length === 0 ? null : (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="heading" accessibilityRole="header">
            {t('detail.references')}
          </Text>
          <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
            {milestone.references.map((reference) => (
              <ListItem
                key={reference.url}
                title={reference.label}
                subtitle={`${hostOf(reference.url)} · ${t('detail.openLink')}`}
                // Só https (validado no catálogo); um erro ao abrir não derruba a tela.
                onPress={() => void Linking.openURL(reference.url).catch(() => undefined)}
              />
            ))}
          </View>
        </View>
      )}
      <Text variant="caption" color="textMuted">
        {t('detail.disclaimer')}
      </Text>
      {back}
    </Screen>
  );
}
