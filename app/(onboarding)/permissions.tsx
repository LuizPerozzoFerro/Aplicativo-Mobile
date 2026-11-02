import { useTranslation } from 'react-i18next';

import { OnboardingStepScreen } from '@/features/onboarding/OnboardingStepScreen';

export default function PermissionsStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen
      step="permissions"
      title={t('permissions.title')}
      body={t('permissions.body')}
    />
  );
}
