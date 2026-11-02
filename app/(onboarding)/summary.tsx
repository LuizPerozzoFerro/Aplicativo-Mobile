import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function SummaryStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen step="summary" title={t('summary.title')} body={t('summary.body')} />
  );
}
