import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { PermissionCards } from '@/features/permissions/PermissionCards';
import { Button, Screen, Text } from '@/ui';

// Estado das permissões fora do onboarding (spec 02, seção 4.5: "por enquanto,
// a etapa de permissões reaproveitada"). Atalho do card de vídeos curtos e,
// no passo 6, do Perfil. Não pode se chamar `permissions`: a etapa do
// onboarding já ocupa essa rota.
export default function PermissionStatusScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  return (
    <Screen>
      <Text variant="title">{t('permissions.title')}</Text>
      <Text>{t('permissions.body')}</Text>
      <PermissionCards deniedText={t('permissions.deniedHere')} />
      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
