import { Alert } from 'react-native';

export type ConfirmDialogOptions = {
  /** Textos já traduzidos (t()). */
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  /** Ação que apaga ou desfaz algo: o botão de confirmar sai com estilo destrutivo. */
  destructive?: boolean;
};

/**
 * Diálogo de confirmação do sistema (spec 02, seção 4.7: "o padrão do sistema,
 * com textos do i18n"). Resolve `true` só se o usuário confirmar; cancelar ou
 * fechar tocando fora (Android) resolve `false`. Para confirmar em duas
 * etapas, chame duas vezes.
 */
export function confirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: ConfirmDialogOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type ChoiceDialogOptions<T extends string> = {
  /** Textos já traduzidos (t()). */
  title: string;
  message?: string;
  /** Uma ou duas escolhas, na ordem em que aparecem depois do cancelar. */
  choices: readonly { value: T; label: string }[];
  cancelLabel: string;
};

/**
 * Diálogo do sistema em que confirmar já é escolher (ex.: recaída "Hoje" ou
 * "Ontem"). Resolve o valor escolhido, ou `null` ao cancelar ou fechar. O
 * Android mostra no máximo três botões, então são até duas escolhas.
 */
export function choiceDialog<T extends string>({
  title,
  message,
  choices,
  cancelLabel,
}: ChoiceDialogOptions<T>): Promise<T | null> {
  if (choices.length < 1 || choices.length > 2) {
    throw new RangeError('O diálogo de escolha aceita uma ou duas escolhas');
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(null) },
        ...choices.map((choice) => ({ text: choice.label, onPress: () => resolve(choice.value) })),
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
