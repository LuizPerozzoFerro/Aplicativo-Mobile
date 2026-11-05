import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  getMonitoring,
  UNSUPPORTED,
  type PermissionKind,
  type PermissionState,
  type PermissionStatus,
} from '@/monitoring';
import { Button, Card, Text, useTheme } from '@/ui';

/** Ordem lógica do doc 01, seção 4.3. */
const ORDER: readonly PermissionKind[] = ['notifications', 'usageAccess', 'overlay'];

export type PermissionCardsProps = {
  /** Linha mostrada depois de "Agora não" ou de um pedido negado, já traduzida. */
  deniedText: string;
};

/**
 * Para cada permissão, o que é, para que serve e o que o Quedo não faz, antes
 * do pedido (divulgação destacada; doc 01, seção 4.3). Usado na etapa 6 do
 * onboarding e na tela de permissões fora dele (atalho do Início e, no passo
 * 6, do Perfil). Nesta fase os pedidos vão ao FakeMonitoringModule, que guarda
 * o estado só na memória.
 */
export function PermissionCards({ deniedText }: PermissionCardsProps) {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  // Recusadas nesta visita ("Agora não" ou negado no pedido).
  const [declined, setDeclined] = useState<PermissionKind[]>([]);

  useEffect(() => {
    let active = true;
    void getMonitoring()
      .getPermissionStatus()
      .then((current) => active && setStatus(current));
    return () => {
      active = false;
    };
  }, []);

  const texts = {
    notifications: {
      title: t('permissions.notifications.title'),
      usesFor: t('permissions.notifications.usesFor'),
      doesNot: t('permissions.notifications.doesNot'),
    },
    usageAccess: {
      title: t('permissions.usageAccess.title'),
      usesFor: t('permissions.usageAccess.usesFor'),
      doesNot: t('permissions.usageAccess.doesNot'),
    },
    overlay: {
      title: t('permissions.overlay.title'),
      usesFor: t('permissions.overlay.usesFor'),
      doesNot: t('permissions.overlay.doesNot'),
    },
  } satisfies Record<PermissionKind, { title: string; usesFor: string; doesNot: string }>;

  const request = async (kind: PermissionKind) => {
    const result = await getMonitoring().requestPermission(kind);
    setStatus((current) => (current ? { ...current, [kind]: result } : current));
    // Negado no pedido do sistema conta como "agora não": mostra que dá para permitir depois.
    setDeclined((current) =>
      result === 'granted'
        ? current.filter((item) => item !== kind)
        : [...new Set([...current, kind])],
    );
  };

  const stateLine = (kind: PermissionKind, state: PermissionState) => {
    if (state === 'granted') return t('permissions.granted');
    if (declined.includes(kind)) return deniedText;
    return null;
  };

  return (
    <>
      {status
        ? ORDER.filter((kind) => status[kind] !== UNSUPPORTED).map((kind) => {
            const state = status[kind] as PermissionState;
            const line = stateLine(kind, state);
            return (
              <Card key={kind}>
                <View style={{ gap: theme.spacing.sm }} testID={`permission-${kind}`}>
                  <Text variant="heading">{texts[kind].title}</Text>
                  <Text variant="bodyStrong">{t('permissions.usesFor')}</Text>
                  <Text>{texts[kind].usesFor}</Text>
                  <Text variant="bodyStrong">{t('permissions.doesNot')}</Text>
                  <Text>{texts[kind].doesNot}</Text>
                  {line ? (
                    <Text color="textMuted" accessibilityLiveRegion="polite">
                      {line}
                    </Text>
                  ) : null}
                  {state === 'granted' ? null : (
                    <>
                      <Button label={t('permissions.allow')} onPress={() => void request(kind)} />
                      {declined.includes(kind) ? null : (
                        <Button
                          label={t('permissions.notNow')}
                          variant="text"
                          onPress={() => setDeclined((current) => [...current, kind])}
                        />
                      )}
                    </>
                  )}
                </View>
              </Card>
            );
          })
        : null}
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="heading">{t('permissions.notes.heading')}</Text>
        <Text color="textMuted">{t('permissions.notes.ongoing')}</Text>
        <Text color="textMuted">{t('permissions.notes.restart')}</Text>
      </View>
    </>
  );
}
