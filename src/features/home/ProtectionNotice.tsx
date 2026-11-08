import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useProtection } from '@/features/monitoring/useProtection';
import { Button, Card, Text } from '@/ui';

/**
 * Aviso de proteção inativa no Início (doc 01, 6.1 e 6.10): diz o que deixou de
 * funcionar e leva à tela de estado. Some quando não há nada faltando.
 */
export function ProtectionNotice() {
  const { t } = useTranslation('home');
  const { protection } = useProtection();

  if (!protection || protection.issues.length === 0) return null;

  const lines = {
    notifications: t('protection.notifications'),
    usageAccess: t('protection.usageAccess'),
    overlay: t('protection.overlay'),
    service: t('protection.service'),
  };

  return (
    <Card testID="home-protection">
      <Text variant="heading">{t('protection.title')}</Text>
      {protection.issues.map((issue) => (
        <Text key={issue}>{lines[issue]}</Text>
      ))}
      <Button
        label={t('protection.action')}
        variant="secondary"
        onPress={() => router.push('/permission-status')}
      />
    </Card>
  );
}
