import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import {
  getMotivationLength,
  getMotivationProblem,
  MAX_MOTIVATION_LENGTH,
} from '@/domain/onboarding';
import { Text, TextField } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 5 (spec 02, seção 4.4): "Por que eu quero mudar?", obrigatório, de 3
 * a 280 caracteres, com contador. Grava sem os espaços das pontas.
 */
export function MotivationStep() {
  const { t } = useTranslation('onboarding');
  const [text, setText] = useState(() => getRepositories().motivation.get()?.text ?? '');
  const problem = getMotivationProblem(text);
  const problemText = { too_short: t('motivation.tooShort'), too_long: t('motivation.tooLong') };

  return (
    <OnboardingStepScreen
      step="motivation"
      title={t('motivation.title')}
      body={t('motivation.body')}
      blockedReason={problem ? problemText[problem] : null}
      onContinue={() => getRepositories().motivation.save(text.trim())}
    >
      <Text color="textMuted">{t('motivation.examples')}</Text>
      <TextField
        label={t('motivation.label')}
        value={text}
        onChangeText={setText}
        multiline
        counter={t('motivation.counter', {
          current: getMotivationLength(text),
          max: MAX_MOTIVATION_LENGTH,
        })}
        // O erro só aparece quando passa do limite; o mínimo fica no motivo do botão.
        error={problem === 'too_long' ? problemText.too_long : undefined}
        testID="motivation-input"
      />
    </OnboardingStepScreen>
  );
}
