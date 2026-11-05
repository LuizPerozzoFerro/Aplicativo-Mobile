import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getRepositories } from '@/data/bootstrap';
import type { UserCompulsion } from '@/data/repositories';
import type { CompulsionType } from '@/domain/compulsion';
import { getMotivationProblem } from '@/domain/onboarding';
import {
  AbstinenceFields,
  CheckInTimeField,
  type AbstinenceSetup,
  getAbstinenceProblem,
  loadAbstinenceSetup,
  saveRiskApps,
  useAbstinenceProblemText,
} from '@/features/setup/AbstinenceFields';
import { useAppTargets } from '@/features/setup/appTargets';
import { MotivationField, useMotivationProblemText } from '@/features/setup/MotivationField';
import {
  getShortVideoProblem,
  loadShortVideoSetup,
  preselectShortVideoApps,
  saveShortVideoSetup,
  ShortVideoFields,
  useShortVideoProblemText,
} from '@/features/setup/ShortVideoFields';
import { loadTriggers, saveTriggers, TriggerFields } from '@/features/setup/TriggerFields';

import { EditScreen } from './EditScreen';

// Telas de edição do Perfil (spec 02, seção 4.6), reaproveitando os campos
// do onboarding. Cada uma grava só ao tocar em "Salvar".

function findCompulsion(type: CompulsionType): UserCompulsion | undefined {
  return getRepositories()
    .compulsions.list()
    .find((compulsion) => compulsion.type === type);
}

/** Apps e limite de vídeos curtos. */
export function EditShortVideosScreen() {
  const { t } = useTranslation(['profile', 'onboarding']);
  const [compulsion] = useState(() => findCompulsion('short_videos'));
  const apps = useAppTargets();
  const [saved, setValue] = useState(() => loadShortVideoSetup(compulsion));
  const problemText = useShortVideoProblemText();

  // Gravada sem apps (não deveria acontecer): pré-marca como no onboarding.
  const value = apps.installed ? preselectShortVideoApps(saved, apps.installed) : saved;

  if (!compulsion) return null;
  const problem = getShortVideoProblem(value);
  return (
    <EditScreen
      title={t('items.shortVideos')}
      blockedReason={
        apps.targets === null ? t('onboarding:setup.loadingApps') : problem && problemText[problem]
      }
      onSave={() => saveShortVideoSetup(compulsion.id, value)}
    >
      <ShortVideoFields value={value} onChange={setValue} apps={apps} showHeading={false} />
    </EditScreen>
  );
}

/** Apps de risco e as declarações. O início da streak não se edita pelo Perfil. */
export function EditRiskAppsScreen() {
  const { t } = useTranslation(['profile', 'onboarding']);
  const [compulsion] = useState(() => findCompulsion('pornography'));
  const apps = useAppTargets();
  // "today": o problema de dias não se aplica aqui, só as declarações.
  const [value, setValue] = useState<AbstinenceSetup>(() => ({
    ...loadAbstinenceSetup(compulsion),
    startMode: 'today',
  }));
  const problemText = useAbstinenceProblemText();

  if (!compulsion) return null;
  const problem = getAbstinenceProblem(value);
  return (
    <EditScreen
      title={t('items.riskApps')}
      blockedReason={
        apps.targets === null ? t('onboarding:setup.loadingApps') : problem && problemText[problem]
      }
      onSave={() => saveRiskApps(compulsion.id, value)}
    >
      <AbstinenceFields
        value={value}
        onChange={setValue}
        apps={apps}
        showStart={false}
        showHeading={false}
      />
    </EditScreen>
  );
}

export function EditCheckInScreen() {
  const { t } = useTranslation('profile');
  const [minutes, setMinutes] = useState(() => getRepositories().settings.get().checkInMinutes);
  return (
    <EditScreen
      title={t('items.checkIn')}
      onSave={() => getRepositories().settings.setCheckInMinutes(minutes)}
    >
      <CheckInTimeField value={minutes} onChange={setMinutes} />
    </EditScreen>
  );
}

export function EditTriggersScreen() {
  const { t } = useTranslation(['profile', 'onboarding']);
  const [value, setValue] = useState(loadTriggers);
  return (
    <EditScreen
      title={t('items.triggers')}
      body={t('onboarding:triggers.body')}
      onSave={() => saveTriggers(value)}
    >
      <TriggerFields value={value} onChange={setValue} />
    </EditScreen>
  );
}

export function EditMotivationScreen() {
  const { t } = useTranslation(['profile', 'onboarding']);
  const [text, setText] = useState(() => getRepositories().motivation.get()?.text ?? '');
  const problem = getMotivationProblem(text);
  const problemText = useMotivationProblemText();
  return (
    <EditScreen
      title={t('items.motivation')}
      body={t('onboarding:motivation.body')}
      blockedReason={problem && problemText[problem]}
      onSave={() => getRepositories().motivation.save(text.trim())}
    >
      <MotivationField value={text} onChange={setText} />
    </EditScreen>
  );
}
