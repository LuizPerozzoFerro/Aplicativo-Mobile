import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sumUsageMinutes, type StreakOverview } from '@/domain/overview';
import { getMonitoring, MonitoringError, UNSUPPORTED } from '@/monitoring';
import { Button, Card, Text } from '@/ui';

import { StreakSummary } from './StreakSummary';

type Props = {
  overview: StreakOverview;
  packageNames: readonly string[];
  dailyLimitMinutes: number;
  /** Momento do último carregamento: muda a cada volta à tela, e o uso é lido de novo. */
  loadedAt: Date;
};

type Usage = { state: 'loading' } | { state: 'inactive' } | { state: 'ready'; minutes: number };

/**
 * Card da moderação (spec 02, seção 4.5): uso de hoje somado entre os apps
 * escolhidos, streak e próximo marco. Sem permissão ou sem suporte, avisa que
 * o acompanhamento ainda não está ativo, com atalho para as permissões.
 */
export function ModerationCard({ overview, packageNames, dailyLimitMinutes, loadedAt }: Props) {
  const { t } = useTranslation(['home', 'common']);
  const [usage, setUsage] = useState<Usage>({ state: 'loading' });

  useEffect(() => {
    let active = true;
    getMonitoring()
      .getUsageToday()
      .then((entries) => {
        if (!active) return;
        setUsage(
          entries === UNSUPPORTED
            ? { state: 'inactive' }
            : { state: 'ready', minutes: sumUsageMinutes(entries, packageNames) },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        // Só a falta de permissão é esperada aqui; outro erro não pode sumir.
        if (error instanceof MonitoringError && error.code === 'permission_required') {
          setUsage({ state: 'inactive' });
        } else {
          throw error;
        }
      });
    return () => {
      active = false;
    };
  }, [packageNames, loadedAt]);

  return (
    <Card testID="home-card-short_videos">
      <Text variant="heading">{t('common:compulsions.short_videos')}</Text>
      {usage.state === 'ready' ? (
        <Text variant="bodyStrong">
          {t('usage.today', { used: usage.minutes, limit: dailyLimitMinutes })}
        </Text>
      ) : null}
      {usage.state === 'inactive' ? (
        <>
          <Text color="textMuted">{t('usage.inactive')}</Text>
          <Button
            label={t('usage.permissions')}
            variant="secondary"
            onPress={() => router.push('/permission-status')}
          />
        </>
      ) : null}
      <StreakSummary overview={overview} mechanic="moderation" />
    </Card>
  );
}
