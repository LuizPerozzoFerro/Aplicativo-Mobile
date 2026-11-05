import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { loadTriggers, saveTriggers, TriggerFields } from '@/features/setup/TriggerFields';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 4 (spec 02, seção 4.4): horários, dias e emoções. Tudo opcional; os
 * gatilhos valem para todas as compulsões.
 */
export function TriggersStep() {
  const { t } = useTranslation('onboarding');
  const [value, setValue] = useState(loadTriggers);

  return (
    <OnboardingStepScreen
      step="triggers"
      title={t('triggers.title')}
      body={t('triggers.body')}
      onContinue={() => saveTriggers(value)}
    >
      <TriggerFields value={value} onChange={setValue} />
    </OnboardingStepScreen>
  );
}
