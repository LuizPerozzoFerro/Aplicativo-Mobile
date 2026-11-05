import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import {
  AbstinenceFields,
  CheckInTimeField,
  getAbstinenceProblem,
  getDaysAlreadyWithoutRelapse,
  loadAbstinenceSetup,
  preselectRiskApps,
  saveRiskApps,
  useAbstinenceProblemText,
} from '@/features/setup/AbstinenceFields';
import { useAppTargets } from '@/features/setup/appTargets';
import {
  getShortVideoProblem,
  loadShortVideoSetup,
  preselectShortVideoApps,
  saveShortVideoSetup,
  ShortVideoFields,
  useShortVideoProblemText,
} from '@/features/setup/ShortVideoFields';
import { useTheme } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';

/**
 * Etapa 3 (spec 02, seção 4.4): uma seção por compulsão escolhida, na ordem
 * da escolha. Vídeos curtos: apps (sugeridos pré-marcados) e limite diário
 * somado. Conteúdo adulto: início da streak, apps de risco com a declaração
 * de cada um e horário do check-in.
 */
export function SetupStep() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const repositories = getRepositories();
  const [compulsions] = useState(() => repositories.compulsions.list());
  const shortVideoCompulsion = compulsions.find((item) => item.type === 'short_videos');
  const abstinenceCompulsion = compulsions.find((item) => item.type === 'pornography');

  const apps = useAppTargets();
  const [savedShortVideo, setShortVideo] = useState(() =>
    shortVideoCompulsion ? loadShortVideoSetup(shortVideoCompulsion) : null,
  );
  const [savedAbstinence, setAbstinence] = useState(() =>
    abstinenceCompulsion ? loadAbstinenceSetup(abstinenceCompulsion) : null,
  );
  const [checkInMinutes, setCheckInMinutes] = useState(
    () => repositories.settings.get().checkInMinutes,
  );
  const shortVideoText = useShortVideoProblemText();
  const abstinenceText = useAbstinenceProblemText();

  // Na primeira vez, os sugeridos que estão instalados aparecem pré-marcados.
  const shortVideo =
    savedShortVideo && apps.installed
      ? preselectShortVideoApps(savedShortVideo, apps.installed)
      : savedShortVideo;
  const abstinence =
    savedAbstinence && apps.installed
      ? preselectRiskApps(savedAbstinence, apps.installed)
      : savedAbstinence;

  const shortVideoProblem = shortVideo ? getShortVideoProblem(shortVideo) : null;
  const abstinenceProblem = abstinence ? getAbstinenceProblem(abstinence) : null;
  const blockedReason =
    apps.targets === null
      ? t('setup.loadingApps')
      : shortVideoProblem
        ? shortVideoText[shortVideoProblem]
        : abstinenceProblem
          ? abstinenceText[abstinenceProblem]
          : null;

  const save = () => {
    if (shortVideo && shortVideoCompulsion) {
      saveShortVideoSetup(shortVideoCompulsion.id, shortVideo);
    }
    if (abstinence && abstinenceCompulsion) {
      saveRiskApps(abstinenceCompulsion.id, abstinence);
      repositories.compulsions.setInitialStreakDays(
        abstinenceCompulsion.id,
        getDaysAlreadyWithoutRelapse(abstinence),
      );
      repositories.settings.setCheckInMinutes(checkInMinutes);
    }
  };

  const sections = compulsions.map((compulsion) =>
    compulsion.type === 'short_videos' && shortVideo ? (
      <ShortVideoFields
        key="short_videos"
        value={shortVideo}
        onChange={setShortVideo}
        apps={apps}
      />
    ) : compulsion.type === 'pornography' && abstinence ? (
      <View key="pornography" style={{ gap: theme.spacing.md }}>
        <AbstinenceFields value={abstinence} onChange={setAbstinence} apps={apps} />
        <CheckInTimeField value={checkInMinutes} onChange={setCheckInMinutes} />
      </View>
    ) : null,
  );

  return (
    <OnboardingStepScreen
      step="setup"
      title={t('setup.title')}
      body={t('setup.body')}
      blockedReason={blockedReason}
      onContinue={save}
    >
      {sections}
    </OnboardingStepScreen>
  );
}
