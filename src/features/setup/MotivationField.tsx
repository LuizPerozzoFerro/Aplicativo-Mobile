import { useTranslation } from 'react-i18next';

import {
  getMotivationLength,
  getMotivationProblem,
  MAX_MOTIVATION_LENGTH,
  type MotivationProblem,
} from '@/domain/onboarding';
import { Text, TextField } from '@/ui';

export function useMotivationProblemText(): Record<MotivationProblem, string> {
  const { t } = useTranslation('onboarding');
  return { too_short: t('motivation.tooShort'), too_long: t('motivation.tooLong') };
}

/**
 * "Por que eu quero mudar?", com exemplos e contador (spec 02, seção 4.4,
 * etapa 5). O mínimo aparece como motivo do botão de quem usa; aqui, só o erro
 * de passar do limite. Usado no onboarding e no Perfil.
 */
export function MotivationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation('onboarding');
  const problemText = useMotivationProblemText();
  const problem = getMotivationProblem(value);

  return (
    <>
      <Text color="textMuted">{t('motivation.examples')}</Text>
      <TextField
        label={t('motivation.label')}
        value={value}
        onChangeText={onChange}
        multiline
        counter={t('motivation.counter', {
          current: getMotivationLength(value),
          max: MAX_MOTIVATION_LENGTH,
        })}
        error={problem === 'too_long' ? problemText.too_long : undefined}
        testID="motivation-input"
      />
    </>
  );
}
