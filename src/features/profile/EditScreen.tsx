import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Screen, Text, useTheme } from '@/ui';

type Props = {
  /** Textos já traduzidos (t()). */
  title: string;
  body?: string;
  children?: ReactNode;
  /** Por que ainda não dá para salvar, já traduzido: desabilita o "Salvar" e aparece embaixo. */
  blockedReason?: string | null;
  /** Grava e volta ao Perfil; se lançar erro, não volta. */
  onSave: () => void;
};

/**
 * Tela de edição do Perfil (spec 02, seção 4.6): o conteúdo, "Salvar" e
 * "Cancelar". Cancelar (ou o Voltar do Android) descarta as mudanças.
 */
export function EditScreen({ title, body, children, blockedReason, onSave }: Props) {
  const { t } = useTranslation('profile');
  const theme = useTheme();

  const save = () => {
    onSave();
    router.back();
  };

  return (
    <Screen>
      <Text variant="title">{title}</Text>
      {body ? <Text color="textMuted">{body}</Text> : null}
      {children}
      <View style={{ flex: 1 }} />
      <View style={{ gap: theme.spacing.sm }}>
        <Button label={t('edit.save')} onPress={save} disabled={Boolean(blockedReason)} />
        {blockedReason ? (
          <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
            {blockedReason}
          </Text>
        ) : null}
        <Button label={t('edit.cancel')} variant="text" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
