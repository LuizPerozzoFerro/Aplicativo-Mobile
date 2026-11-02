import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, View } from 'react-native';

import { Button, Screen, Text, useTheme } from '@/ui';

import { onboardingStatus } from './onboardingStatus';
import { isFirstStep, nextStep, type OnboardingStep } from './steps';

export type OnboardingStepScreenProps = {
  step: OnboardingStep;
  /** Textos já traduzidos (t()). */
  title: string;
  body: string;
};

/**
 * Tela vazia do onboarding (passo 6): título, texto provisório e Voltar/Continuar.
 * Na primeira tela, voltar pede confirmação antes de fechar o app (spec 4.4).
 */
export function OnboardingStepScreen({ step, title, body }: OnboardingStepScreenProps) {
  const { t } = useTranslation(['onboarding', 'common']);
  const theme = useTheme();
  const first = isFirstStep(step);

  const confirmExit = useCallback(() => {
    Alert.alert(t('exit.title'), t('exit.message'), [
      { text: t('exit.stay'), style: 'cancel' },
      { text: t('exit.leave'), style: 'destructive', onPress: () => BackHandler.exitApp() },
    ]);
  }, [t]);

  // Botão "voltar" do Android na primeira tela: confirma em vez de fechar.
  useFocusEffect(
    useCallback(() => {
      if (!first) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmExit();
        return true;
      });
      return () => subscription.remove();
    }, [first, confirmExit]),
  );

  const goBack = () => (first ? confirmExit() : router.back());
  const goNext = () => {
    const next = nextStep(step);
    if (next) {
      router.push(`/${next}`);
    } else {
      // Última tela: as rotas protegidas trocam o onboarding pelas abas.
      onboardingStatus.setCompleted(true);
    }
  };

  return (
    <Screen>
      <Text variant="title">{title}</Text>
      <Text color="textMuted">{body}</Text>
      <View style={{ flex: 1 }} />
      <View style={{ gap: theme.spacing.sm }}>
        <Button label={t('common:actions.continue')} onPress={goNext} />
        <Button label={t('common:actions.back')} variant="text" onPress={goBack} />
      </View>
    </Screen>
  );
}
