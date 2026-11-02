import { useTranslation } from 'react-i18next';

import { EmptyState, Screen, Text } from '@/ui';

export default function HomeTab() {
  const { t } = useTranslation('tabs');
  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('home')}</Text>
      <EmptyState title={t('empty.home.title')} description={t('empty.home.description')} />
    </Screen>
  );
}
