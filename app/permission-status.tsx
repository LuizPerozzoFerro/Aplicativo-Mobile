import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { MonitoringStatusCard } from '@/features/permissions/MonitoringStatusCard';
import { PermissionCards } from '@/features/permissions/PermissionCards';
import { Button, Screen, Text } from '@/ui';

// Estado do monitoramento (spec 03, 5.7; doc 01, 6.9): o serviço, as permissões
// e o que fazer em cada caso. Atalho do Início, do Perfil e da notificação de
// proteção pausada. Não pode se chamar `permissions`: a etapa do onboarding já
// ocupa essa rota.
export default function PermissionStatusScreen() {
  const { t } = useTranslation(['onboarding', 'common']);
  return (
    <Screen>
      <Text variant="title">{t('permissions.title')}</Text>
      <Text>{t('permissions.body')}</Text>
      <MonitoringStatusCard />
      <PermissionCards deniedText={t('permissions.deniedHere')} />
      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
