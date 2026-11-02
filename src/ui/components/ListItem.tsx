import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type ListItemProps = {
  /** Textos já traduzidos (t()). */
  title: string;
  subtitle?: string;
  /** Elemento à direita (ícone, valor, chave). */
  trailing?: ReactNode;
  onPress?: () => void;
  testID?: string;
};

/**
 * Linha de lista com altura mínima de 48 dp. Com onPress, vira um botão
 * acessível com título e subtítulo lidos juntos.
 */
export function ListItem({ title, subtitle, trailing, onPress, testID }: ListItemProps) {
  const theme = useTheme();
  const content = (
    <>
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </>
  );
  const style = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.md,
    minHeight: theme.minTouchTarget,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  };

  if (!onPress) {
    return (
      <View testID={testID} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
}
