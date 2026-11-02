import '@/i18n';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { useOnboardingCompleted } from '@/features/onboarding/onboardingStatus';
import { useTheme } from '@/ui';

export default function RootLayout() {
  const theme = useTheme();
  const onboardingCompleted = useOnboardingCompleted();

  // Fundo nativo da janela no tema atual: evita o clarão branco no modo escuro
  // durante transições e na abertura do app.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.background);
  }, [theme.colors.background]);

  return (
    <>
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
        </Stack.Protected>
      </Stack>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}
