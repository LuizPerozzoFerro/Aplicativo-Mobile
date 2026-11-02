import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getAppInfo } from '@/config/appInfo';
import type { Environment } from '@/config/variant';
import { Button, ListItem, Screen, Text, useTheme } from '@/ui';

// Sobre o app (spec 01, seção 4.12): nome, versão, build e ambiente, mais o
// link da política de privacidade, que ainda é um marcador (Fase 7).
export default function AboutScreen() {
  const { t } = useTranslation(['about', 'common']);
  const theme = useTheme();
  const info = getAppInfo();
  const valueOrUnavailable = (value: string | null) => value ?? t('unavailable');
  // Chaves literais (o teste de chaves recusa chave montada); o `satisfies`
  // obriga a ter todos os ambientes.
  const environmentLabels = {
    development: t('environments.development'),
    preview: t('environments.preview'),
    production: t('environments.production'),
  } satisfies Record<Environment, string>;

  return (
    <Screen>
      <Text variant="title">{t('title')}</Text>
      <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <ListItem title={t('fields.name')} subtitle={valueOrUnavailable(info.name)} />
        <ListItem title={t('fields.version')} subtitle={valueOrUnavailable(info.version)} />
        <ListItem title={t('fields.build')} subtitle={valueOrUnavailable(info.build)} />
        <ListItem title={t('fields.environment')} subtitle={environmentLabels[info.environment]} />
      </View>
      {/* Sem onPress até a política existir (Fase 7). */}
      <View style={{ borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <ListItem title={t('privacy.title')} subtitle={t('privacy.pending')} />
      </View>
      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
