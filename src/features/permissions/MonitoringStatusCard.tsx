import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useProtection } from '@/features/monitoring/useProtection';
import { formatDate } from '@/i18n/format';
import { getMonitoring } from '@/monitoring';
import { Button, Card, Text } from '@/ui';

/** Se o serviço está de fato rodando e o que fazer em cada caso (spec 03, 5.7; doc 01, 6.9). */
export function MonitoringStatusCard() {
  const { t } = useTranslation('monitoring');
  const { protection, refresh } = useProtection();
  const [restartFailed, setRestartFailed] = useState(false);

  if (!protection) return null;
  const { situation, service, issues } = protection;

  const restart = async () => {
    try {
      await getMonitoring().startMonitoring();
      setRestartFailed(false);
    } catch {
      setRestartFailed(true);
    }
    refresh();
  };

  return (
    <Card testID="monitoring-status">
      <Text variant="heading">{t('status.title')}</Text>
      {situation === 'idle' ? <Text>{t('status.idle')}</Text> : null}
      {situation === 'needs_usage_access' ? <Text>{t('status.needsUsageAccess')}</Text> : null}
      {situation === 'running' ? (
        <>
          <Text variant="bodyStrong">{t('status.running')}</Text>
          <Text color="textMuted">
            {service.lastCheckAt === null
              ? t('status.noCheckYet')
              : t('status.lastCheck', {
                  time: formatDate(new Date(service.lastCheckAt), {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }),
                })}
          </Text>
        </>
      ) : null}
      {situation === 'stopped' ? (
        <>
          <Text>{t('status.stopped')}</Text>
          {restartFailed ? (
            <Text color="textMuted" accessibilityLiveRegion="polite">
              {t('status.restartFailed')}
            </Text>
          ) : null}
          <Button label={t('status.restart')} onPress={() => void restart()} />
        </>
      ) : null}
      {issues.includes('overlay') ? <Text>{t('status.overlayMissing')}</Text> : null}
      {issues.includes('notifications') ? <Text>{t('status.notificationsMissing')}</Text> : null}
    </Card>
  );
}
