import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
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

/**
 * Raiz de toda tela: fundo do tema, área segura, rolagem e teclado. Com o
 * teclado aberto, a área visível encolhe e a rolagem leva o campo com foco
 * para a vista (spec 02, seção 4.4). `padding` também no Android: com
 * edge-to-edge (Android 15+), o `adjustResize` não encolhe a janela, e sem
 * `behavior` o KeyboardAvoidingView não faz nada (medido no S22;
 * NOTAS-APP.md, passo 4).
 */
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {scroll ? (
          <ScrollView
            contentContainerStyle={[contentStyle, { flexGrow: 1 }]}
            // Um toque num botão com o teclado aberto já age, sem precisar fechar o teclado antes.
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[contentStyle, { flex: 1 }]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
