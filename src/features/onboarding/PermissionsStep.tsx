import { useTranslation } from 'react-i18next';

import { PermissionCards } from '@/features/permissions/PermissionCards';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 6 (spec 02, seção 4.4; doc 01, seção 4.3): os cartões de permissão,
 * com a explicação antes de cada pedido. Nada é obrigatório.
 */
export function PermissionsStep() {
  const { t } = useTranslation('onboarding');
  return (
    <OnboardingStepScreen
      step="permissions"
      title={t('permissions.title')}
      body={t('permissions.body')}
    >
      <PermissionCards deniedText={t('permissions.denied')} />
    </OnboardingStepScreen>
  );
}
