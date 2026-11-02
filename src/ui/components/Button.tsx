import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { useTheme, type Theme } from '../theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  /** Texto do botão, já traduzido (t()). */
  label: string;
  variant?: ButtonVariant;
};

function variantStyle(theme: Theme, variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return { container: { backgroundColor: theme.colors.primary }, color: 'onPrimary' as const };
    case 'secondary':
      return {
        container: {
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outline,
        },
        color: 'text' as const,
      };
    case 'text':
      return { container: { backgroundColor: 'transparent' }, color: 'primary' as const };
  }
}

/** Botão com área de toque mínima de 48 dp e estado acessível. */
export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const { container, color } = variantStyle(theme, variant);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: theme.minTouchTarget,
          minWidth: theme.minTouchTarget,
          borderRadius: theme.radii.md,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
        container,
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      <Text variant="label" color={color} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  label: { textAlign: 'center' },
});
