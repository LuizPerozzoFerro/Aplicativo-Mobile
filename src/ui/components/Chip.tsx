import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

/** Seleção simples (só um marcado, como rádio) ou múltipla (como caixa de seleção). */
export type ChipMode = 'single' | 'multiple';

export type ChipProps = Omit<PressableProps, 'children' | 'style'> & {
  /** Texto do chip, já traduzido (t()). */
  label: string;
  selected: boolean;
  mode?: ChipMode;
};

/**
 * Chip de seleção com área de toque mínima de 48 dp. O leitor de tela anuncia
 * o papel (rádio ou caixa de seleção) e se está marcado. Marcado e desmarcado
 * diferem pelo fundo e pelo peso da fonte, não só pela cor.
 */
export function Chip({ label, selected, mode = 'multiple', disabled, ...rest }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: theme.minTouchTarget,
          minWidth: theme.minTouchTarget,
          borderRadius: theme.radii.pill,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
          borderColor: selected ? theme.colors.primary : theme.colors.outline,
          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
        },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      <Text
        variant={selected ? 'label' : 'body'}
        color={selected ? 'onPrimary' : 'text'}
        style={styles.label}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export type ChipOption<T extends string | number> = {
  value: T;
  /** Já traduzido (t()). */
  label: string;
};

export type ChipGroupProps<T extends string | number> = {
  /** Nome do grupo para o leitor de tela, já traduzido. */
  label: string;
  options: readonly ChipOption<T>[];
  selected: readonly T[];
  /** Recebe a seleção nova, na ordem das opções. */
  onChange: (selected: T[]) => void;
  mode?: ChipMode;
  disabled?: boolean;
  testID?: string;
};

/**
 * Grupo de chips em linhas que quebram. No modo simples, tocar marca só aquele
 * (tocar de novo não desmarca); no múltiplo, cada toque alterna.
 */
export function ChipGroup<T extends string | number>({
  label,
  options,
  selected,
  onChange,
  mode = 'multiple',
  disabled,
  testID,
}: ChipGroupProps<T>) {
  const theme = useTheme();
  const toggle = (value: T) => {
    if (mode === 'single') {
      onChange([value]);
      return;
    }
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(options.map((option) => option.value).filter((item) => next.includes(item)));
  };

  return (
    <View
      testID={testID}
      accessibilityRole={mode === 'single' ? 'radiogroup' : undefined}
      accessibilityLabel={label}
      style={[styles.group, { gap: theme.spacing.sm }]}
    >
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          mode={mode}
          selected={selected.includes(option.value)}
          disabled={disabled}
          onPress={() => toggle(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  label: { textAlign: 'center' },
  group: { flexDirection: 'row', flexWrap: 'wrap' },
});
