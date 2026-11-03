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
