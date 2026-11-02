import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function TriggersStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen step="triggers" title={t('triggers.title')} body={t('triggers.body')} />
  );
}
