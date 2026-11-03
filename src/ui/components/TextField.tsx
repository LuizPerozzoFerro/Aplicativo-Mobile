import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Rótulo visível e lido pelo leitor de tela, já traduzido (t()). */
  label: string;
  /** Texto de apoio abaixo do campo (ex.: "Opcional"), já traduzido. */
  helper?: string;
  /** Contador já formatado (ex.: "12/280"), já traduzido. */
  counter?: string;
  /** Mensagem de erro, já traduzida. Com ela, o contorno fica na cor de erro. */
  error?: string;
};

/**
 * Campo de texto com rótulo, apoio, contador e erro. A contagem e a validação
 * ficam com quem usa (ex.: getMotivationLength): aqui só se mostra.
 */
export function TextField({
  label,
  helper,
  counter,
  error,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.primary
      : theme.colors.outline;
  // O leitor de tela lê o erro (ou o apoio) e o contador depois do rótulo.
  const hint = [error ?? helper, counter].filter(Boolean).join('. ') || undefined;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...rest}
        style={[
          theme.typography.body,
          styles.input,
          {
            minHeight: multiline ? theme.minTouchTarget * 2 : theme.minTouchTarget,
            borderColor,
            borderWidth: focused || error ? 2 : StyleSheet.hairlineWidth * 2,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />
      {error || helper || counter ? (
        <View style={[styles.footer, { gap: theme.spacing.sm }]}>
          <Text
            variant="caption"
            color={error ? 'danger' : 'textMuted'}
            style={styles.footerMessage}
          >
            {error ?? helper ?? ''}
          </Text>
          {counter ? (
            <Text variant="caption" color={error ? 'danger' : 'textMuted'}>
              {counter}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { textAlignVertical: 'top' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  footerMessage: { flex: 1 },
});
