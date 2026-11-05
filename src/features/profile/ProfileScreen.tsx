import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { variant } from '@/config/variant';
import { getRepositories } from '@/data/bootstrap';
import type { CompulsionType } from '@/domain/compulsion';
import { onboardingProgress } from '@/features/onboarding/onboardingProgress';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { useTriggerLabels } from '@/features/onboarding/useTriggerLabels';
import { confirmDialog, ListItem, Screen, Text, useTheme } from '@/ui';

function load() {
  const repositories = getRepositories();
  return {
    compulsions: repositories.compulsions.list(),
    checkInMinutes: repositories.settings.get().checkInMinutes,
  };
}

/** Grupo de itens com cantos arredondados. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="heading">{title}</Text>
      <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

/**
 * Perfil (spec 02, seção 4.6; doc 01, seção 6.9): editar tudo o que foi
 * respondido no onboarding, as permissões e "Apagar meus dados". Recarrega ao
 * ganhar o foco, depois de cada edição.
 */
export function ProfileScreen() {
  const { t } = useTranslation(['profile', 'tabs', 'common']);
  const labels = useTriggerLabels();
  const [data, setData] = useState(load);
  useFocusEffect(useCallback(() => setData(load()), []));

  const compulsion = (type: CompulsionType) => data.compulsions.find((item) => item.type === type);
  const shortVideos = compulsion('short_videos');
  const adult = compulsion('pornography');
  const compulsionLabels = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;

  const deleteData = async () => {
    const first = await confirmDialog({
      title: t('deleteData.first.title'),
      message: t('deleteData.first.message'),
      confirmLabel: t('deleteData.first.confirm'),
      cancelLabel: t('deleteData.first.cancel'),
      destructive: true,
    });
    if (!first) return;
    const second = await confirmDialog({
      title: t('deleteData.second.title'),
      message: t('deleteData.second.message'),
      confirmLabel: t('deleteData.second.confirm'),
      cancelLabel: t('deleteData.second.cancel'),
      destructive: true,
    });
    if (!second) return;
    getRepositories().deleteAllData();
    // O banco já voltou ao padrão; a memória acompanha, e as rotas protegidas
    // levam às boas-vindas (pendência herdada da Fase 2).
    onboardingProgress.setStep(null);
    onboardingStatus.setCompleted(false);
  };

  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('tabs:profile')}</Text>

      <Section title={t('sections.choices')}>
        <ListItem
          title={t('items.compulsions')}
          subtitle={labels.joinList(data.compulsions.map((item) => compulsionLabels[item.type]))}
          onPress={() => router.push('/edit/compulsions')}
        />
        {shortVideos ? (
          <ListItem
            title={t('items.shortVideos')}
            subtitle={t('items.shortVideosHint', { minutes: shortVideos.dailyLimitMinutes ?? 0 })}
            onPress={() => router.push('/edit/short-videos')}
          />
        ) : null}
        {adult ? (
          <>
            <ListItem
              title={t('items.riskApps')}
              subtitle={t('items.riskAppsHint')}
              onPress={() => router.push('/edit/risk-apps')}
            />
            <ListItem
              title={t('items.checkIn')}
              subtitle={t('items.checkInHint', { time: labels.formatMinutes(data.checkInMinutes) })}
              onPress={() => router.push('/edit/check-in')}
            />
          </>
        ) : null}
        <ListItem
          title={t('items.triggers')}
          subtitle={t('items.triggersHint')}
          onPress={() => router.push('/edit/triggers')}
        />
        <ListItem
          title={t('items.motivation')}
          subtitle={t('items.motivationHint')}
          onPress={() => router.push('/edit/motivation')}
        />
      </Section>

      <Section title={t('sections.app')}>
        <ListItem
          title={t('items.permissions')}
          subtitle={t('items.permissionsHint')}
          onPress={() => router.push('/permission-status')}
        />
        <ListItem
          title={t('tabs:profileItems.about')}
          subtitle={t('tabs:profileItems.aboutHint')}
          onPress={() => router.push('/about')}
        />
        {/* Só em development (spec 4.4): zera a flag e as rotas protegidas voltam ao início. */}
        {variant.environment === 'development' ? (
          <ListItem
            title={t('tabs:profileItems.resetOnboarding')}
            subtitle={t('tabs:profileItems.resetOnboardingHint')}
            onPress={() => onboardingStatus.setCompleted(false)}
          />
        ) : null}
        {/* Só em development: vitrine dos componentes para conferir no aparelho. */}
        {variant.environment === 'development' ? (
          <ListItem
            title={t('tabs:profileItems.components')}
            subtitle={t('tabs:profileItems.componentsHint')}
            onPress={() => router.push('/dev-components')}
          />
        ) : null}
        <ListItem
          title={t('items.deleteData')}
          subtitle={t('items.deleteDataHint')}
          onPress={() => void deleteData()}
          testID="delete-data"
        />
      </Section>
    </Screen>
  );
}
