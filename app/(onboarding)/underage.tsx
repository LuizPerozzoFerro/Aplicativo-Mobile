import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Screen, Text } from '@/ui';

// Bloqueio de menores (spec 02, seção 4.4, etapa 1; doc 01, 7.6). Não grava
// nada: reabrir o app volta às boas-vindas. O "Voltar" existe para corrigir
// um toque errado no "Não".
export default function UnderageScreen() {
  const { t } = useTranslation('onboarding');
  return (
    <Screen>
      <Text variant="title">{t('underage.title')}</Text>
      <Text color="textMuted">{t('underage.body')}</Text>
      <Button
        label={t('underage.back')}
        variant="secondary"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      />
    </Screen>
  );
}
