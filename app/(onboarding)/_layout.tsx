import { Stack } from 'expo-router';

import { useTheme } from '@/ui';

export const unstable_settings = { initialRouteName: 'welcome' };

export default function OnboardingLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
