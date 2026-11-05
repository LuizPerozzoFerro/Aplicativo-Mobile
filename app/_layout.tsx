import '@/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useDatabase } from '@/data/bootstrap';
import { useOnboardingCompleted } from '@/features/onboarding/onboardingStatus';
import { EmptyState, Screen, useTheme } from '@/ui';

export default function RootLayout() {
  const theme = useTheme();
  const database = useDatabase();

  // Fundo nativo da janela no tema atual: evita o clarão branco no modo escuro
  // durante transições e na abertura do app.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <>
      {database.status === 'ready' ? (
        <AppNavigator />
      ) : database.status === 'error' ? (
        <DatabaseError />
      ) : (
        // Migrações em andamento: só o fundo, por uma fração de segundo.
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      )}
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const onboardingCompleted = useOnboardingCompleted();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {/* Sem onboarding concluído, só o onboarding; depois, só as abas (spec 4.4). */}
      <Stack.Protected guard={!onboardingCompleted} redirectTo="/">
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingCompleted} redirectTo="/welcome">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="about" />
        <Stack.Screen name="permission-status" />
        <Stack.Screen name="dev-components" />
      </Stack.Protected>
    </Stack>
  );
}

function DatabaseError() {
  const { t } = useTranslation('common');
  return (
    <Screen>
      <EmptyState
        title={t('errors.database.title')}
        description={t('errors.database.description')}
      />
    </Screen>
  );
}
