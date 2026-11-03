import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { getAbstinenceStart } from '@/domain/streak';
import { parseTimeRange, type TimeRange } from '@/domain/timeRange';
import { EMOTIONS, WEEKDAYS, type Emotion, type Weekday } from '@/domain/triggers';
import { getMonitoring, UNSUPPORTED } from '@/monitoring';
import { Card, Text, useTheme } from '@/ui';

import { OnboardingStepScreen } from './OnboardingStepScreen';
import { useTriggerLabels } from './useTriggerLabels';

/**
 * Etapa 7 (spec 02, seção 4.4): resumo das escolhas e "Começar". O início de
 * cada compulsão é o dia do "Começar" (spec 02 v0.2, 4.3); na abstinência,
 * menos os dias sem recair informados na etapa 3. Sem teste nem preço
 * (Fase 6).
 */
export function SummaryStep() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const labels = useTriggerLabels();
  const repositories = getRepositories();
  const [data] = useState(() => ({
    compulsions: repositories.compulsions.list(),
    triggers: repositories.triggers.list().filter((trigger) => trigger.compulsionId === null),
    motivation: repositories.motivation.get()?.text ?? '',
    checkInMinutes: repositories.settings.get().checkInMinutes,
  }));
  const [appNames, setAppNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    void getMonitoring()
      .listTargets()
      .then((result) => {
        if (!active || result === UNSUPPORTED) return;
        setAppNames(
          Object.fromEntries(result.map((target) => [target.id as string, target.label ?? ''])),
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const appList = (compulsionId: number) =>
    repositories.monitoredApps
      .listByCompulsion(compulsionId)
      .map((app) => appNames[app.packageName] || app.packageName);

  const ranges = data.triggers
    .filter((trigger) => trigger.kind === 'time')
    .map((trigger) => parseTimeRange(trigger.value))
    .filter((range): range is TimeRange => range !== null);
  const days = WEEKDAYS.filter((day) =>
    data.triggers.some((trigger) => trigger.kind === 'weekday' && trigger.value === String(day)),
  );
  const emotions = EMOTIONS.filter((emotion) =>
    data.triggers.some((trigger) => trigger.kind === 'emotion' && trigger.value === emotion),
  );

  const start = () => {
    const now = new Date();
    for (const compulsion of data.compulsions) {
      const abstinence = getCompulsionDefinition(compulsion.type).mechanic === 'abstinence';
      repositories.compulsions.setStartedAt(
        compulsion.id,
        abstinence ? getAbstinenceStart(now, compulsion.initialStreakDays ?? 0) : now,
      );
    }
  };

  return (
    <OnboardingStepScreen
      step="summary"
      title={t('summary.title')}
      body={t('summary.body')}
      continueLabel={t('summary.start')}
      onContinue={start}
    >
      <Text variant="heading">{t('summary.choices')}</Text>
      {data.compulsions.map((compulsion) => {
        const apps = appList(compulsion.id);
        return compulsion.type === 'short_videos' ? (
          <Card key={compulsion.id} testID="summary-short-videos">
            <Text variant="bodyStrong">{t('setup.shortVideos.heading')}</Text>
            <Text>
              {apps.length > 0
                ? t('summary.apps', { apps: labels.joinList(apps) })
                : t('summary.noApps')}
            </Text>
            <Text>{t('summary.limit', { minutes: compulsion.dailyLimitMinutes ?? 0 })}</Text>
          </Card>
        ) : (
          <Card key={compulsion.id} testID="summary-adult">
            <Text variant="bodyStrong">{t('setup.adult.heading')}</Text>
            <Text>
              {(compulsion.initialStreakDays ?? 0) > 0
                ? t('summary.startDaysAgo', { days: compulsion.initialStreakDays })
                : t('summary.startToday')}
            </Text>
            <Text>
              {apps.length > 0
                ? t('summary.riskApps', { apps: labels.joinList(apps) })
                : t('summary.noRiskApps')}
            </Text>
            <Text>{t('summary.checkIn', { time: labels.formatMinutes(data.checkInMinutes) })}</Text>
          </Card>
        );
      })}

      <Text variant="heading">{t('summary.triggers')}</Text>
      <Card testID="summary-triggers">
        {ranges.length + days.length + emotions.length === 0 ? (
          <Text>{t('summary.noTriggers')}</Text>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {ranges.length > 0 ? (
              <Text>
                {t('summary.times', { times: labels.joinList(labels.formatMergedRanges(ranges)) })}
              </Text>
            ) : null}
            {days.length > 0 ? (
              <Text>
                {t('summary.days', {
                  days: labels.joinList(days.map((day: Weekday) => labels.weekdays[day])),
                })}
              </Text>
            ) : null}
            {emotions.length > 0 ? (
              <Text>
                {t('summary.emotions', {
                  emotions: labels.joinList(
                    emotions.map((emotion: Emotion) => labels.emotions[emotion]),
                  ),
                })}
              </Text>
            ) : null}
          </View>
        )}
      </Card>

      <Text variant="heading">{t('summary.motivation')}</Text>
      <Card>
        <Text>{data.motivation}</Text>
      </Card>
    </OnboardingStepScreen>
  );
}
