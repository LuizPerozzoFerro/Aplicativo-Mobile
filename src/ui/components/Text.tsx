import { Text as NativeText, type TextProps as NativeTextProps } from 'react-native';

import { useTheme } from '../theme';
import type { ColorTokens, TypographyVariant } from '../tokens';

type TextColor = Extract<
  keyof ColorTokens,
  'text' | 'textMuted' | 'primary' | 'onPrimary' | 'danger' | 'onDanger'
>;

export type TextProps = NativeTextProps & {
  variant?: TypographyVariant;
  color?: TextColor;
};

const HEADING_VARIANTS: TypographyVariant[] = ['display', 'title', 'heading'];

/**
 * Texto com as variantes tipográficas do app. Acompanha o tamanho de fonte do
 * sistema; títulos são anunciados como cabeçalho pelo leitor de tela.
 */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const theme = useTheme();
  return (
    <NativeText
      accessibilityRole={HEADING_VARIANTS.includes(variant) ? 'header' : undefined}
      {...rest}
      style={[theme.typography[variant], { color: theme.colors[color] }, style]}
    />
  );
}
