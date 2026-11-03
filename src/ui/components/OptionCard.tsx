import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type OptionCardProps = Omit<PressableProps, 'children' | 'style'> & {
  /** Textos já traduzidos (t()). */
  title: string;
  description?: string;
  selected: boolean;
};

/**
 * Cartão de escolha múltipla com título e uma linha de explicação (ex.: as
 * compulsões no onboarding). Caixa de seleção para o leitor de tela, com o
 * estado anunciado. Marcado e desmarcado diferem na caixa (cheia ou vazia) e
 * na borda, não só na cor.
 */
export function OptionCard({ title, description, selected, disabled, ...rest }: OptionCardProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={description ? `${title}, ${description}` : title}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.card,
        {
          minHeight: theme.minTouchTarget,
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth * 2,
        },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: theme.radii.sm,
            borderColor: selected ? theme.colors.primary : theme.colors.outline,
            backgroundColor: selected ? theme.colors.primary : 'transparent',
          },
        ]}
      >
        {selected ? <View style={[styles.mark, { borderColor: theme.colors.onPrimary }]} /> : null}
      </View>
      <View style={[styles.texts, { gap: theme.spacing.xs }]}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? (
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 24, height: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  // Visto desenhado com duas bordas de um retângulo girado.
  mark: {
    width: 7,
    height: 13,
    borderRightWidth: 2.5,
    borderBottomWidth: 2.5,
    transform: [{ rotate: '45deg' }],
    marginTop: -3,
  },
  texts: { flex: 1 },
});
