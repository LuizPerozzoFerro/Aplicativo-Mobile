import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import type { UserCompulsion } from '@/data/repositories';
import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  getAbstinenceSetupProblem,
  getShortVideoSetupProblem,
  parseWholeNumber,
  type AbstinenceStartMode,
} from '@/domain/onboarding';
import { getPreselectedPackages } from '@/domain/suggestedApps';
import { getMonitoring, UNSUPPORTED, type MonitoringTarget } from '@/monitoring';
import { ChipGroup, Text, TextField, TimePicker, useTheme } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';

type LimitChoice = number | 'other';

/** Estado da seção de vídeos curtos. `apps` nulo: esperando a lista de apps para pré-marcar. */
type ShortVideoState = {
  compulsionId: number;
  apps: string[] | null;
  limitChoice: LimitChoice;
  otherLimit: string;
};

/** Estado da seção de conteúdo adulto. Declaração nula: ainda não respondida. */
type AbstinenceState = {
  compulsionId: number;
  startMode: AbstinenceStartMode;
  days: string;
  riskApps: string[] | null;
  declarations: Record<string, boolean | null>;
};

const isOption = (minutes: number) => (DAILY_LIMIT_OPTIONS as readonly number[]).includes(minutes);

function initialShortVideo(compulsion: UserCompulsion): ShortVideoState {
  // Já configurada (voltou à etapa): mostra o gravado; senão, os padrões.
  const configured = compulsion.dailyLimitMinutes !== null;
  const limit = compulsion.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES;
  return {
    compulsionId: compulsion.id,
    apps: configured
      ? getRepositories()
          .monitoredApps.listByCompulsion(compulsion.id)
          .map((app) => app.packageName)
      : null,
    limitChoice: isOption(limit) ? limit : 'other',
    otherLimit: isOption(limit) ? '' : String(limit),
  };
}

function initialAbstinence(compulsion: UserCompulsion): AbstinenceState {
  const configured = compulsion.initialStreakDays !== null;
  const days = compulsion.initialStreakDays ?? 0;
  const saved = configured ? getRepositories().monitoredApps.listByCompulsion(compulsion.id) : null;
  return {
    compulsionId: compulsion.id,
    startMode: days > 0 ? 'days_ago' : 'today',
    days: days > 0 ? String(days) : '',
    riskApps: saved?.map((app) => app.packageName) ?? null,
    declarations: Object.fromEntries(
      (saved ?? []).map((app) => [app.packageName, app.declaredConsumption]),
    ),
  };
}

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

  const [targets, setTargets] = useState<MonitoringTarget[] | null>(null);
  const [shortVideo, setShortVideo] = useState(() =>
    shortVideoCompulsion ? initialShortVideo(shortVideoCompulsion) : null,
  );
  const [abstinence, setAbstinence] = useState(() =>
    abstinenceCompulsion ? initialAbstinence(abstinenceCompulsion) : null,
  );
  const [checkInMinutes, setCheckInMinutes] = useState(
    () => repositories.settings.get().checkInMinutes,
  );

  // Apps instalados (Android). Na primeira vez, pré-marca os sugeridos que existem.
  useEffect(() => {
    let active = true;
    void getMonitoring()
      .listTargets()
      .then((result) => {
        if (!active) return;
        const list = result === UNSUPPORTED ? [] : result;
        const ids = list.map((target) => target.id as string);
        setTargets(list);
        setShortVideo((state) =>
          state && state.apps === null
            ? { ...state, apps: getPreselectedPackages('short_video', ids) }
            : state,
        );
        setAbstinence((state) =>
          state && state.riskApps === null
            ? {
                ...state,
                riskApps: getPreselectedPackages('risk', ids),
                declarations: Object.fromEntries(
                  getPreselectedPackages('risk', ids).map((id) => [id, null]),
                ),
              }
            : state,
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const labelOf = (id: string) =>
    targets?.find((target) => (target.id as string) === id)?.label ?? id;
  const appOptions = (targets ?? []).map((target) => ({
    value: target.id as string,
    label: target.label ?? (target.id as string),
  }));

  const dailyLimit = shortVideo
    ? shortVideo.limitChoice === 'other'
      ? parseWholeNumber(shortVideo.otherLimit)
      : shortVideo.limitChoice
    : Number.NaN;
  const shortVideoProblem = shortVideo
    ? getShortVideoSetupProblem({
        appCount: shortVideo.apps?.length ?? 0,
        dailyLimitMinutes: dailyLimit,
      })
    : null;
  const abstinenceProblem = abstinence
    ? getAbstinenceSetupProblem({
        startMode: abstinence.startMode,
        daysAlreadyWithoutRelapse: parseWholeNumber(abstinence.days),
        riskAppDeclarations: (abstinence.riskApps ?? []).map(
          (id) => abstinence.declarations[id] ?? null,
        ),
      })
    : null;

  const problemText = {
    no_apps: t('setup.shortVideos.noApps'),
    invalid_limit: t('setup.shortVideos.invalidLimit'),
    invalid_days: t('setup.adult.invalidDays'),
    undeclared_app: t('setup.adult.undeclared'),
  };
  const problem = shortVideoProblem ?? abstinenceProblem;
  const loading = targets === null;

  const save = () => {
    if (shortVideo) {
      repositories.monitoredApps.replaceForCompulsion(
        shortVideo.compulsionId,
        (shortVideo.apps ?? []).map((packageName) => ({ packageName, role: 'short_video' })),
      );
      repositories.compulsions.setDailyLimit(shortVideo.compulsionId, dailyLimit);
    }
    if (abstinence) {
      repositories.monitoredApps.replaceForCompulsion(
        abstinence.compulsionId,
        (abstinence.riskApps ?? []).map((packageName) => ({
          packageName,
          role: 'risk',
          declaredConsumption: abstinence.declarations[packageName] ?? null,
        })),
      );
      repositories.compulsions.setInitialStreakDays(
        abstinence.compulsionId,
        abstinence.startMode === 'today' ? 0 : parseWholeNumber(abstinence.days),
      );
      repositories.settings.setCheckInMinutes(checkInMinutes);
    }
  };

  const sections = compulsions.map((compulsion) =>
    compulsion.type === 'short_videos' && shortVideo ? (
      <View key="short_videos" style={{ gap: theme.spacing.md }}>
        <Text variant="heading">{t('setup.shortVideos.heading')}</Text>
        <Text variant="bodyStrong">{t('setup.shortVideos.apps')}</Text>
        <Text color="textMuted">{t('setup.shortVideos.appsHint')}</Text>
        {appOptions.length > 0 ? (
          <ChipGroup
            label={t('setup.shortVideos.apps')}
            options={appOptions}
            selected={shortVideo.apps ?? []}
            onChange={(apps) => setShortVideo({ ...shortVideo, apps })}
            testID="short-video-apps"
          />
        ) : loading ? null : (
          <Text color="textMuted">{t('setup.noAppsFound')}</Text>
        )}
        <Text variant="bodyStrong">{t('setup.shortVideos.limit')}</Text>
        <Text color="textMuted">{t('setup.shortVideos.limitHint')}</Text>
        <ChipGroup<LimitChoice>
          label={t('setup.shortVideos.limit')}
          mode="single"
          options={[
            ...DAILY_LIMIT_OPTIONS.map((minutes) => ({
              value: minutes,
              label: t('setup.shortVideos.limitOption', { minutes }),
            })),
            { value: 'other', label: t('setup.shortVideos.other') },
          ]}
          selected={[shortVideo.limitChoice]}
          onChange={([limitChoice]) =>
            limitChoice !== undefined && setShortVideo({ ...shortVideo, limitChoice })
          }
        />
        {shortVideo.limitChoice === 'other' ? (
          <TextField
            label={t('setup.shortVideos.otherLabel')}
            value={shortVideo.otherLimit}
            onChangeText={(otherLimit) => setShortVideo({ ...shortVideo, otherLimit })}
            keyboardType="number-pad"
            maxLength={3}
            error={
              shortVideo.otherLimit !== '' && shortVideoProblem === 'invalid_limit'
                ? problemText.invalid_limit
                : undefined
            }
          />
        ) : null}
      </View>
    ) : compulsion.type === 'pornography' && abstinence ? (
      <View key="pornography" style={{ gap: theme.spacing.md }}>
        <Text variant="heading">{t('setup.adult.heading')}</Text>
        <Text variant="bodyStrong">{t('setup.adult.start')}</Text>
        <ChipGroup<AbstinenceStartMode>
          label={t('setup.adult.start')}
          mode="single"
          options={[
            { value: 'today', label: t('setup.adult.startToday') },
            { value: 'days_ago', label: t('setup.adult.startDaysAgo') },
          ]}
          selected={[abstinence.startMode]}
          onChange={([startMode]) =>
            startMode !== undefined && setAbstinence({ ...abstinence, startMode })
          }
        />
        {abstinence.startMode === 'days_ago' ? (
          <TextField
            label={t('setup.adult.daysLabel')}
            value={abstinence.days}
            onChangeText={(days) => setAbstinence({ ...abstinence, days })}
            keyboardType="number-pad"
            maxLength={4}
            error={
              abstinence.days !== '' && abstinenceProblem === 'invalid_days'
                ? problemText.invalid_days
                : undefined
            }
          />
        ) : null}
        <Text variant="bodyStrong">{t('setup.adult.riskApps')}</Text>
        <Text color="textMuted">{t('setup.adult.riskAppsHint')}</Text>
        {appOptions.length > 0 ? (
          <ChipGroup
            label={t('setup.adult.riskApps')}
            options={appOptions}
            selected={abstinence.riskApps ?? []}
            onChange={(riskApps) =>
              setAbstinence({
                ...abstinence,
                riskApps,
                // App novo começa sem resposta; quem sai da lista perde a dele.
                declarations: Object.fromEntries(
                  riskApps.map((id) => [id, abstinence.declarations[id] ?? null]),
                ),
              })
            }
            testID="risk-apps"
          />
        ) : loading ? null : (
          <Text color="textMuted">{t('setup.noAppsFound')}</Text>
        )}
        {(abstinence.riskApps ?? []).map((id) => {
          const question = t('setup.adult.declare', { app: labelOf(id) });
          const declared = abstinence.declarations[id] ?? null;
          return (
            <View key={id} style={{ gap: theme.spacing.sm }}>
              <Text>{question}</Text>
              <ChipGroup<'yes' | 'no'>
                label={question}
                mode="single"
                options={[
                  { value: 'yes', label: t('setup.adult.yes') },
                  { value: 'no', label: t('setup.adult.no') },
                ]}
                selected={declared === null ? [] : [declared ? 'yes' : 'no']}
                onChange={([answer]) =>
                  setAbstinence({
                    ...abstinence,
                    declarations: { ...abstinence.declarations, [id]: answer === 'yes' },
                  })
                }
              />
            </View>
          );
        })}
        <TimePicker
          label={t('setup.adult.checkIn')}
          value={checkInMinutes}
          onChange={setCheckInMinutes}
          testID="check-in-time"
        />
        <Text color="textMuted">{t('setup.adult.checkInHint')}</Text>
      </View>
    ) : null,
  );

  return (
    <OnboardingStepScreen
      step="setup"
      title={t('setup.title')}
      body={t('setup.body')}
      blockedReason={loading ? t('setup.loadingApps') : problem ? problemText[problem] : null}
      onContinue={save}
    >
      {sections}
    </OnboardingStepScreen>
  );
}
