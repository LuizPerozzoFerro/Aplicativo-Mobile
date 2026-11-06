import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { COMPULSION_TYPES, type CompulsionType } from '@/domain/compulsion';
import { getCompulsionChoiceProblem } from '@/domain/onboarding';
import { Button, Card, confirmDialog, Screen, Text, useTheme } from '@/ui';

/**
 * Minhas escolhas (spec 02, seção 4.6): adicionar a compulsão que falta, que
 * abre a configuração dela, ou remover uma, com confirmação, porque o
 * histórico dela é apagado. Pelo menos uma precisa continuar.
 */
export function CompulsionsScreen() {
  const { t } = useTranslation(['profile', 'onboarding', 'common']);
  const theme = useTheme();
  const [compulsions, setCompulsions] = useState(() => getRepositories().compulsions.list());
  // Volta da tela de adicionar: recarrega.
  useFocusEffect(useCallback(() => setCompulsions(getRepositories().compulsions.list()), []));

  const texts = {
    pornography: {
      title: t('common:compulsions.pornography'),
      description: t('onboarding:compulsions.adult.description'),
    },
    short_videos: {
      title: t('common:compulsions.short_videos'),
      description: t('onboarding:compulsions.shortVideos.description'),
    },
  } satisfies Record<CompulsionType, { title: string; description: string }>;
  const isLastOne = getCompulsionChoiceProblem(compulsions.length - 1) !== null;

  const remove = async (id: number) => {
    const confirmed = await confirmDialog({
      title: t('compulsions.removeDialog.title'),
      message: t('compulsions.removeDialog.message'),
      confirmLabel: t('compulsions.removeDialog.confirm'),
      cancelLabel: t('compulsions.removeDialog.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    getRepositories().compulsions.remove(id);
    setCompulsions(getRepositories().compulsions.list());
  };

  return (
    <Screen>
      <Text variant="title">{t('compulsions.title')}</Text>
      <Text color="textMuted">{t('compulsions.body')}</Text>
      {COMPULSION_TYPES.map((type) => {
        const saved = compulsions.find((compulsion) => compulsion.type === type);
        return (
          <Card key={type} testID={`profile-compulsion-${type}`}>
            <Text variant="heading">{texts[type].title}</Text>
            <Text color="textMuted">{texts[type].description}</Text>
            <Text variant="bodyStrong">
              {saved ? t('compulsions.active') : t('compulsions.inactive')}
            </Text>
            {saved ? (
              <View style={{ gap: theme.spacing.xs }}>
                <Button
                  label={t('compulsions.remove')}
                  variant="secondary"
                  disabled={isLastOne}
                  onPress={() => void remove(saved.id)}
                />
                {isLastOne ? (
                  <Text variant="caption" color="textMuted">
                    {t('compulsions.lastOne')}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Button
                label={t('compulsions.add')}
                onPress={() => router.push({ pathname: '/edit/add-compulsion', params: { type } })}
              />
            )}
          </Card>
        );
      })}
      <Button label={t('common:actions.back')} variant="text" onPress={() => router.back()} />
    </Screen>
  );
}
