import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { COMPULSION_TYPES, type CompulsionType } from '@/domain/compulsion';
import { getCompulsionChoiceProblem } from '@/domain/onboarding';
import { confirmDialog, OptionCard, useTheme } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 2 (spec 02, seção 4.4): uma ou as duas compulsões. A ordem em que são
 * escolhidas vira a ordem dos cards no Início (a ordem de inserção no banco).
 * Tirar uma compulsão já gravada pede confirmação: ao avançar, as respostas
 * dela são apagadas (cascata).
 */
export function CompulsionsStep() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const repositories = getRepositories();
  // A tela continua montada quando se volta a ela: o gravado é lido na hora de usar.
  const savedNow = () => repositories.compulsions.list();
  const [selected, setSelected] = useState<CompulsionType[]>(() =>
    savedNow().map((compulsion) => compulsion.type),
  );

  const labels = {
    pornography: {
      title: t('compulsions.adult.title'),
      description: t('compulsions.adult.description'),
    },
    short_videos: {
      title: t('compulsions.shortVideos.title'),
      description: t('compulsions.shortVideos.description'),
    },
  } satisfies Record<CompulsionType, { title: string; description: string }>;

  const toggle = async (type: CompulsionType) => {
    if (!selected.includes(type)) {
      setSelected([...selected, type]);
      return;
    }
    const isSaved = savedNow().some((compulsion) => compulsion.type === type);
    if (
      isSaved &&
      !(await confirmDialog({
        title: t('compulsions.remove.title'),
        message: t('compulsions.remove.message'),
        confirmLabel: t('compulsions.remove.confirm'),
        cancelLabel: t('compulsions.remove.cancel'),
        destructive: true,
      }))
    ) {
      return;
    }
    setSelected((current) => current.filter((item) => item !== type));
  };

  const save = () => {
    const saved = savedNow();
    for (const compulsion of saved) {
      if (!selected.includes(compulsion.type)) repositories.compulsions.remove(compulsion.id);
    }
    for (const type of selected) {
      // O início provisório é trocado pelo dia do "Começar" na última etapa.
      if (!saved.some((compulsion) => compulsion.type === type)) {
        repositories.compulsions.add({ type, startedAt: new Date() });
      }
    }
  };

  return (
    <OnboardingStepScreen
      step="compulsions"
      title={t('compulsions.title')}
      body={t('compulsions.body')}
      blockedReason={
        getCompulsionChoiceProblem(selected.length) ? t('compulsions.noneSelected') : null
      }
      onContinue={save}
    >
      <View style={{ gap: theme.spacing.md }}>
        {COMPULSION_TYPES.map((type) => (
          <OptionCard
            key={type}
            title={labels[type].title}
            description={labels[type].description}
            selected={selected.includes(type)}
            onPress={() => void toggle(type)}
          />
        ))}
      </View>
    </OnboardingStepScreen>
  );
}
