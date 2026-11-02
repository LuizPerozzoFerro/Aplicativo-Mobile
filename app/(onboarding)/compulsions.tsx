import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function CompulsionsStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen
      step="compulsions"
      title={t('compulsions.title')}
      body={t('compulsions.body')}
    />
  );
}
