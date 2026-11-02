import { useTranslation } from 'react-i18next';

import { EmptyState, Screen, Text } from '@/ui';

export default function StatsTab() {
  const { t } = useTranslation('tabs');
  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('stats')}</Text>
      <EmptyState title={t('empty.stats.title')} description={t('empty.stats.description')} />
    </Screen>
  );
}
