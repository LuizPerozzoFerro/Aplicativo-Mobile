import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useProtection } from '@/features/monitoring/useProtection';
import { Button, Card, Text } from '@/ui';

/**
 * Aviso de proteção inativa no Início (doc 01, 6.1 e 6.10): diz o que falta e
 * leva à tela de estado. "Proteção pausada" é o que parou de funcionar; "Ative
 * o acompanhamento" é o que nunca foi concedido, e só este pode ser adiado.
 */
export function ProtectionNotice() {
  const { t } = useTranslation('home');
  const { protection, dismissNotice } = useProtection();

  const notice = protection?.notice;
  if (!notice) return null;

  const lines = {
    notifications: t('protection.notifications'),
    usageAccess: t('protection.usageAccess'),
    overlay: t('protection.overlay'),
    service: t('protection.service'),
  };

  return (
    <Card testID="home-protection">
      <Text variant="heading">
        {notice.kind === 'paused' ? t('protection.title') : t('protection.activateTitle')}
      </Text>
      {notice.issues.map((issue) => (
        <Text key={issue}>{lines[issue]}</Text>
      ))}
      <Button
        label={t('protection.action')}
        variant="secondary"
        onPress={() => router.push('/permission-status')}
      />
      {notice.kind === 'activate' ? (
        <Button label={t('protection.notNow')} variant="text" onPress={dismissNotice} />
      ) : null}
    </Card>
  );
}
