import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { variant } from '@/config/variant';
import { onboardingStatus } from '@/features/onboarding/onboardingStatus';
import { ListItem, Screen, Text, useTheme } from '@/ui';

export default function ProfileTab() {
  const { t } = useTranslation('tabs');
  const theme = useTheme();

  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('profile')}</Text>
      <View style={{ gap: theme.spacing.xs, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <ListItem
          title={t('profileItems.about')}
          subtitle={t('profileItems.aboutHint')}
          onPress={() => router.push('/about')}
        />
        {/* Só em development (spec 4.4): zera a flag e as rotas protegidas voltam ao início. */}
        {variant.environment === 'development' ? (
          <ListItem
            title={t('profileItems.resetOnboarding')}
            subtitle={t('profileItems.resetOnboardingHint')}
            onPress={() => onboardingStatus.setCompleted(false)}
          />
        ) : null}
      </View>
    </Screen>
  );
}
