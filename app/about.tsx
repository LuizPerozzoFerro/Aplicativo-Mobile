import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/ui';

// Provisória: o conteúdo (versão, build, ambiente) entra no passo 9 (spec 4.12).
export default function AboutScreen() {
  const { t } = useTranslation(['about', 'common']);
  return (
    <Screen>
      <Text variant="title">{t('title')}</Text>
      <Text color="textMuted">{t('pending')}</Text>
      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
