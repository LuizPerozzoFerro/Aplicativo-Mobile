import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';
import { useResumeStep } from '@/features/onboarding/useResumeStep';

export default function WelcomeStep() {
  const { t } = useTranslation('onboarding');
  // O app abre aqui: com uma etapa gravada, segue direto para ela.
  const resumeStep = useResumeStep();
  if (resumeStep) return <Redirect href={`/${resumeStep}`} />;
  return (
    <OnboardingStepScreen step="welcome" title={t('welcome.title')} body={t('welcome.body')} />
  );
}
