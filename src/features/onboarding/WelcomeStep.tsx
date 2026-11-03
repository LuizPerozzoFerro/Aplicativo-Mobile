import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import { Button, Text } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 1 (spec 02, seção 4.4): apresentação e confirmação de idade. "Sim"
 * grava a confirmação e avança; "Não" leva à tela de bloqueio sem gravar nada.
 */
export function WelcomeStep() {
  const { t } = useTranslation('onboarding');

  return (
    <OnboardingStepScreen
      step="welcome"
      title={t('welcome.title')}
      body={t('welcome.body')}
      renderActions={(goNext) => (
        <>
          <Text variant="heading">{t('welcome.ageQuestion')}</Text>
          <Button
            label={t('welcome.ageYes')}
            onPress={() => {
              getRepositories().settings.setAgeConfirmedAt(new Date());
              goNext();
            }}
          />
          <Button
            label={t('welcome.ageNo')}
            variant="secondary"
            onPress={() => router.push('/underage')}
          />
        </>
      )}
    >
      <Text color="textMuted">{t('welcome.privacy')}</Text>
    </OnboardingStepScreen>
  );
}
