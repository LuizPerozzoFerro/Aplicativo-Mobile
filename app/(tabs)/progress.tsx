import { useTranslation } from 'react-i18next';

import { EmptyState, Screen, Text } from '@/ui';

export default function ProgressTab() {
  const { t } = useTranslation('tabs');
  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('progress')}</Text>
      <EmptyState title={t('empty.progress.title')} description={t('empty.progress.description')} />
    </Screen>
  );
}
