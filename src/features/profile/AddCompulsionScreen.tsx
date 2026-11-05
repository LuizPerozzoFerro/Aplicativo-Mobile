import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { CompulsionType } from '@/domain/compulsion';
import { getAbstinenceStart } from '@/domain/streak';
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
  getDailyLimit,
  getShortVideoProblem,
  loadShortVideoSetup,
  preselectShortVideoApps,
  saveShortVideoSetup,
  ShortVideoFields,
  useShortVideoProblemText,
} from '@/features/setup/ShortVideoFields';
import { useTheme } from '@/ui';

import { EditScreen } from './EditScreen';

/**
 * Adicionar pelo Perfil a compulsão que falta (spec 02, seção 4.6), com a
 * mesma configuração do onboarding. Nada é gravado antes do "Salvar". O
 * início é o dia em que ela é adicionada (spec 02 v0.2, 4.3); na abstinência,
 * "há N dias" conta a partir desse dia, como no "Começar" do onboarding.
 */
export function AddCompulsionScreen({ type }: { type: CompulsionType }) {
  const { t } = useTranslation(['profile', 'onboarding', 'common']);
  const theme = useTheme();
  const apps = useAppTargets();
  const [draftShortVideo, setShortVideo] = useState(() => loadShortVideoSetup(null));
  const [draftAbstinence, setAbstinence] = useState(() => loadAbstinenceSetup(null));
  const [checkInMinutes, setCheckInMinutes] = useState(
    () => getRepositories().settings.get().checkInMinutes,
  );
  const shortVideoText = useShortVideoProblemText();
  const abstinenceText = useAbstinenceProblemText();
  const [alreadyAdded] = useState(() =>
    getRepositories()
      .compulsions.list()
      .some((compulsion) => compulsion.type === type),
  );

  const shortVideo = apps.installed
    ? preselectShortVideoApps(draftShortVideo, apps.installed)
    : draftShortVideo;
  const abstinence = apps.installed
    ? preselectRiskApps(draftAbstinence, apps.installed)
    : draftAbstinence;

  if (alreadyAdded) return null;

  const titles = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;

  const shortVideoProblem = type === 'short_videos' ? getShortVideoProblem(shortVideo) : null;
  const abstinenceProblem = type === 'pornography' ? getAbstinenceProblem(abstinence) : null;

  const save = () => {
    const repositories = getRepositories();
    const now = new Date();
    if (type === 'short_videos') {
      const added = repositories.compulsions.add({
        type,
        startedAt: now,
        dailyLimitMinutes: getDailyLimit(shortVideo),
      });
      saveShortVideoSetup(added.id, shortVideo);
    } else {
      const days = getDaysAlreadyWithoutRelapse(abstinence);
      const added = repositories.compulsions.add({
        type,
        startedAt: getAbstinenceStart(now, days),
      });
      repositories.compulsions.setInitialStreakDays(added.id, days);
      saveRiskApps(added.id, abstinence);
      repositories.settings.setCheckInMinutes(checkInMinutes);
    }
  };

  return (
    <EditScreen
      title={titles[type]}
      body={t('add.body')}
      blockedReason={
        apps.targets === null
          ? t('onboarding:setup.loadingApps')
          : shortVideoProblem
            ? shortVideoText[shortVideoProblem]
            : abstinenceProblem && abstinenceText[abstinenceProblem]
      }
      onSave={save}
    >
      {type === 'short_videos' ? (
        <ShortVideoFields
          value={shortVideo}
          onChange={setShortVideo}
          apps={apps}
          showHeading={false}
        />
      ) : (
        <View style={{ gap: theme.spacing.md }}>
          <AbstinenceFields
            value={abstinence}
            onChange={setAbstinence}
            apps={apps}
            showHeading={false}
          />
          <CheckInTimeField value={checkInMinutes} onChange={setCheckInMinutes} />
        </View>
      )}
    </EditScreen>
  );
}
