import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function MotivationStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen
      step="motivation"
      title={t('motivation.title')}
      body={t('motivation.body')}
    />
  );
}
