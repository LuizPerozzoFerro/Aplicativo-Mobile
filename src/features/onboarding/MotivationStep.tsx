import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import { getMotivationProblem } from '@/domain/onboarding';
import { MotivationField, useMotivationProblemText } from '@/features/setup/MotivationField';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 5 (spec 02, seção 4.4): "Por que eu quero mudar?", obrigatório, de 3
 * a 280 caracteres, com contador. Grava sem os espaços das pontas.
 */
export function MotivationStep() {
  const { t } = useTranslation('onboarding');
  const [text, setText] = useState(() => getRepositories().motivation.get()?.text ?? '');
  const problem = getMotivationProblem(text);
  const problemText = useMotivationProblemText();

  return (
    <OnboardingStepScreen
      step="motivation"
      title={t('motivation.title')}
      body={t('motivation.body')}
      blockedReason={problem ? problemText[problem] : null}
      onContinue={() => getRepositories().motivation.save(text.trim())}
    >
      <MotivationField value={text} onChange={setText} />
    </OnboardingStepScreen>
  );
}
