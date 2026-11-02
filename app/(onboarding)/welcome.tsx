import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function WelcomeStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen step="welcome" title={t('welcome.title')} body={t('welcome.body')} />
  );
}
