import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, View } from 'react-native';

import { Button, Screen, Text, useTheme } from '@/ui';

import { onboardingProgress } from './onboardingProgress';
import { onboardingStatus } from './onboardingStatus';
import {
  getNextOnboardingStep,
  getPreviousOnboardingStep,
  isFirstStep,
  type OnboardingStep,
} from './steps';

export type OnboardingStepScreenProps = {
  step: OnboardingStep;
  /** Textos já traduzidos (t()). */
  title: string;
  body: string;
};

/**
 * Tela do onboarding: título, texto e Continuar/Voltar. Ao avançar, grava a
 * etapa seguinte (progresso salvo, spec 02 seção 4.4). A primeira tela não tem
 * botão Voltar; o Voltar do Android nela pede confirmação antes de fechar.
 */
export function OnboardingStepScreen({ step, title, body }: OnboardingStepScreenProps) {
  const { t } = useTranslation(['onboarding', 'common']);
  const theme = useTheme();
  const navigation = useNavigation();
  const first = isFirstStep(step);

  // Uma etapa apareceu: a retomada desta sessão já aconteceu (ou não era preciso).
  useEffect(() => onboardingProgress.markResumed(), []);

  const confirmExit = useCallback(() => {
    Alert.alert(t('exit.title'), t('exit.message'), [
      { text: t('exit.stay'), style: 'cancel' },
      { text: t('exit.leave'), style: 'destructive', onPress: () => BackHandler.exitApp() },
    ]);
  }, [t]);

  /**
   * Volta sempre à etapa anterior. Depois de uma retomada a pilha não tem as
   * etapas anteriores: aí a anterior substitui a atual em vez de um back().
   */
  const goBack = useCallback(() => {
    const previous = getPreviousOnboardingStep(step);
    if (!previous) {
      confirmExit();
      return;
    }
    const state = navigation.getState();
    const below = state?.routes[state.index - 1]?.name;
    if (below === previous) router.back();
    else router.replace(`/${previous}`);
  }, [step, navigation, confirmExit]);

  // Voltar do Android: o mesmo do botão (e, na primeira tela, a confirmação).
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );

  const goNext = () => {
    const next = getNextOnboardingStep(step);
    if (next) {
      onboardingProgress.setStep(next);
      router.push(`/${next}`);
    } else {
      // Última tela: limpa a etapa, e as rotas protegidas trocam o onboarding pelas abas.
      onboardingProgress.setStep(null);
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
        {first ? null : <Button label={t('common:actions.back')} variant="text" onPress={goBack} />}
      </View>
    </Screen>
  );
}
