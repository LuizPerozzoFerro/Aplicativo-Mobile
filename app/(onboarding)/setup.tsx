import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function SetupStep() {
  const { t } = useTranslation('onboarding');
  return <OnboardingStepScreen step="setup" title={t('setup.title')} body={t('setup.body')} />;
}
