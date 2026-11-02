import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  /** Rolagem do conteúdo; ligada por padrão, para fontes grandes não cortarem texto. */
  scroll?: boolean;
  /** Bordas protegidas pela área segura; com abas, a de baixo fica com a barra. */
  edges?: Edge[];
  testID?: string;
};

/** Raiz de toda tela: fundo do tema, área segura e rolagem. */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const contentStyle = { padding: theme.spacing.lg, gap: theme.spacing.lg };

  return (
    <SafeAreaView
      testID={testID}
      edges={edges}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={[contentStyle, { flexGrow: 1 }]}>{children}</ScrollView>
      ) : (
        <View style={[contentStyle, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
