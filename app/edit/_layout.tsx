import { Stack } from 'expo-router';

import { useTheme } from '@/ui';

// Telas de edição do Perfil (spec 02, seção 4.6), empilhadas sobre as abas.
export default function EditLayout() {
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
