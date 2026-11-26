import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { getRepositories } from '@/data/bootstrap';
import { isCompulsionType, type CompulsionType } from '@/domain/compulsion';
import { addCalendarDays, fromDayKey } from '@/domain/day';
import { splitMinutes, type InterruptionSummary, type StreakStats } from '@/domain/statistics';
import { useLiveSnapshot } from '@/features/milestones/useLiveSnapshot';
import { useAppTargets } from '@/features/setup/appTargets';
import { formatDate } from '@/i18n/format';
import { Button, Card, ChipGroup, EmptyState, Screen, Text, useTheme } from '@/ui';

import { BarRows, HourColumns, TriggerLegend, type BarRowItem } from './charts';
import { loadStats, type AbstinenceStats, type ModerationStats } from './statsData';
import { useUsageAccess } from './useUsageAccess';

const ALL_APPS = 'all';
const DAYS_PER_WEEK = 7;

/** Durações em texto: curta na tela ("1 h 05 min") e por extenso para o leitor de tela. */
function useDurations() {
  const { t } = useTranslation('stats');
  const short = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (hours === 0) return t('duration.minutes', { minutes });
    if (minutes === 0) return t('duration.hours', { hours });
    return t('duration.hoursMinutes', { hours, minutes: String(minutes).padStart(2, '0') });
  };
  const spoken = (total: number) => {
    const { hours, minutes } = splitMinutes(total);
    if (hours === 0) return t('spoken.minutes', { count: minutes });
    if (minutes === 0) return t('spoken.hours', { count: hours });
    return t('spoken.hoursMinutes', {
      hours: t('spoken.hours', { count: hours }),
      minutes: t('spoken.minutes', { count: minutes }),
    });
  };
  /** Descrição de um gráfico: o título e os valores, separados. */
  const describe = (title: string, items: readonly string[]) =>
    t('spoken.list', { title, items: items.length > 0 ? items.join('; ') : t('chart.none') });
  return { short, spoken, describe };
}

const shortDate = (dayKey: string) =>
  formatDate(fromDayKey(dayKey) ?? new Date(NaN), { day: '2-digit', month: '2-digit' });
const fullDate = (dayKey: string) =>
  formatDate(fromDayKey(dayKey) ?? new Date(NaN), { dateStyle: 'short' });

/**
 * Aba Estatísticas (spec 04, 5.8): filtro por compulsão (com mais de uma
 * ativa), as estatísticas da compulsão escolhida e a seção geral. O filtro é o
 * parâmetro `compulsion` da rota, como no Progresso. Os números vêm do banco,
 * lidos de novo a cada gravação, ao voltar à tela e à meia-noite.
 */
export function StatsScreen() {
  const { t } = useTranslation(['stats', 'tabs', 'common']);
  const params = useLocalSearchParams<{ compulsion?: string }>();
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const load = useCallback(
    (now: Date) => loadStats(getRepositories(), now, appFilter),
    [appFilter],
  );
  const { now, data } = useLiveSnapshot(load);
  const usageAccess = useUsageAccess();
  const chosen = isCompulsionType(params.compulsion) ? params.compulsion : null;

  const names = {
    pornography: t('common:compulsions.pornography'),
    short_videos: t('common:compulsions.short_videos'),
  } satisfies Record<CompulsionType, string>;

  const selected =
    data.compulsions.find((item) => item.compulsion.type === chosen) ?? data.compulsions[0] ?? null;

  return (
    <Screen edges={['top']}>
      <Text variant="title">{t('tabs:stats')}</Text>
      {selected === null ? (
        <EmptyState
          testID="stats-empty"
          title={t('tabs:empty.stats.title')}
          description={t('tabs:empty.stats.description')}
        />
      ) : (
        <>
          {data.compulsions.length > 1 ? (
            <ChipGroup
              testID="stats-filter"
              label={t('filterLabel')}
              mode="single"
              options={data.compulsions.map((item) => ({
                value: item.compulsion.type,
                label: names[item.compulsion.type],
              }))}
              selected={[selected.compulsion.type]}
              onChange={([type]) => {
                if (type !== undefined) router.setParams({ compulsion: type });
              }}
            />
          ) : null}
          <Text variant="heading" testID={`stats-heading-${selected.compulsion.type}`}>
            {names[selected.compulsion.type]}
          </Text>
          {selected.mechanic === 'moderation' ? (
            <ModerationSections
              stats={selected}
              now={now}
              usageAccessGranted={usageAccess === null || usageAccess === 'granted'}
              onAppChange={setAppFilter}
            />
          ) : (
            <AbstinenceSections stats={selected} />
          )}
        </>
      )}
      <GeneralSection stats={data.emergency} />
    </Screen>
  );
}

function ModerationSections({
  stats,
  now,
  usageAccessGranted,
  onAppChange,
}: {
  stats: ModerationStats;
  now: Date;
  usageAccessGranted: boolean;
  onAppChange: (app: string | null) => void;
}) {
  return (
    <>
      {usageAccessGranted ? (
        <>
          <UsageCard stats={stats} onAppChange={onAppChange} />
          <HoursCard stats={stats} now={now} />
          <RecoveredCard stats={stats} />
        </>
      ) : (
        <NoAccessCard />
      )}
      <AlertsCard summary={stats.interruptions} />
      <DaysCard stats={stats} />
      <StreaksCard streaks={stats.streaks} />
    </>
  );
}

function AbstinenceSections({ stats }: { stats: AbstinenceStats }) {
  return (
    <>
      <StreaksCard streaks={stats.streaks} relapses={stats.relapses} />
      <CheckInsCard stats={stats} />
      <RiskAppsCard stats={stats} />
    </>
  );
}

function NoAccessCard() {
  const { t } = useTranslation('stats');
  return (
    <Card testID="stats-no-access">
      <Text variant="bodyStrong">{t('noAccess.title')}</Text>
      <Text color="textMuted">{t('noAccess.description')}</Text>
      <Button
        label={t('noAccess.action')}
        variant="secondary"
        onPress={() => router.push('/permission-status')}
      />
    </Card>
  );
}

function UsageCard({
  stats,
  onAppChange,
}: {
  stats: ModerationStats;
  onAppChange: (app: string | null) => void;
}) {
  const { t } = useTranslation('stats');
  const { short, spoken, describe } = useDurations();
  const { labelOf } = useAppTargets();
  const limit = stats.dailyLimitMinutes;

  const dayLabel = (dayKey: string, index: number) =>
    index === stats.daily.length - 1
      ? t('usage.today')
      : formatDate(fromDayKey(dayKey) ?? new Date(NaN), {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
        });
  const daily: BarRowItem[] = stats.daily.map((day, index) => ({
    key: day.dayKey,
    label: dayLabel(day.dayKey, index),
    value: day.minutes,
    valueText: day.minutes === null ? t('usage.noData') : short(day.minutes),
  }));
  const dailyDescription = describe(
    [t('usage.dailyChart'), limit === null ? null : t('usage.limit', { duration: spoken(limit) })]
      .filter((part) => part !== null)
      .join('. '),
    stats.daily.map((day, index) => {
      const label = dayLabel(day.dayKey, index);
      if (day.minutes === null) return t('usage.item', { label, value: t('usage.noData') });
      const value = spoken(day.minutes);
      return limit !== null && day.minutes > limit
        ? t('usage.itemOverLimit', { label, value })
        : t('usage.item', { label, value });
    }),
  );

  const weekLabel = (from: string, to: string) =>
    t('usage.weekLabel', { from: shortDate(from), to: shortDate(to) });
  const partial = (covered: number) =>
    covered < DAYS_PER_WEEK ? t('usage.weekPartial', { count: covered }) : null;
  const weekly: BarRowItem[] = stats.weekly.map((week) => ({
    key: week.startDayKey,
    label: weekLabel(week.startDayKey, week.endDayKey),
    value: week.minutes,
    valueText:
      week.minutes === null
        ? t('usage.noData')
        : [short(week.minutes), partial(week.coveredDays)].filter(Boolean).join(' · '),
  }));
  const weeklyDescription = describe(
    t('usage.weeklyChart'),
    stats.weekly.map((week) => {
      const label = weekLabel(week.startDayKey, week.endDayKey);
      if (week.minutes === null) return t('usage.item', { label, value: t('usage.noData') });
      return t('usage.item', {
        label,
        value: [spoken(week.minutes), partial(week.coveredDays)].filter(Boolean).join(', '),
      });
    }),
  );

  const hasDaily = stats.daily.some((day) => day.minutes !== null);
  const hasWeekly = stats.weekly.some((week) => week.minutes !== null);

  return (
    <Card testID="stats-usage">
      <Text variant="heading" accessibilityRole="header">
        {t('usage.title')}
      </Text>
      {stats.apps.length > 1 ? (
        <ChipGroup
          testID="stats-app-filter"
          label={t('usage.appFilterLabel')}
          mode="single"
          options={[
            { value: ALL_APPS, label: t('usage.allApps') },
            ...stats.apps.map((app) => ({ value: app, label: labelOf(app) })),
          ]}
          selected={[stats.appPackage ?? ALL_APPS]}
          onChange={([value]) => {
            if (value !== undefined) onAppChange(value === ALL_APPS ? null : value);
          }}
        />
      ) : null}
      <Text variant="bodyStrong">{t('usage.daily')}</Text>
      <Text variant="caption" color="textMuted">
        {t('usage.dailyCaption')}
      </Text>
      {limit !== null ? (
        <Text variant="caption">{t('usage.limit', { duration: short(limit) })}</Text>
      ) : null}
      {hasDaily ? (
        <BarRows testID="stats-daily" items={daily} marker={limit} description={dailyDescription} />
      ) : (
        <Text color="textMuted">{t('usage.empty')}</Text>
      )}
      <Text variant="bodyStrong">{t('usage.weekly')}</Text>
      <Text variant="caption" color="textMuted">
        {t('usage.weeklyCaption')}
      </Text>
      {hasWeekly ? (
        <BarRows testID="stats-weekly" items={weekly} description={weeklyDescription} />
      ) : (
        <Text color="textMuted">{t('usage.empty')}</Text>
      )}
    </Card>
  );
}

function HoursCard({ stats, now }: { stats: ModerationStats; now: Date }) {
  const { t } = useTranslation(['stats', 'common']);
  const { spoken, describe } = useDurations();
  const hourLabel = (hour: number) => t('common:time.hour', { hour });
  const { hourly, peakHour, triggerHours } = stats;

  let body;
  if (hourly.days === 0) {
    body = (
      <Text color="textMuted" testID="stats-hours-pending">
        {t('hours.pending', {
          date: formatDate(addCalendarDays(now, 1), { dateStyle: 'short' }),
        })}
      </Text>
    );
  } else if (peakHour === null) {
    body = <Text color="textMuted">{t('hours.noUse')}</Text>;
  } else {
    const items = hourly.minutesByHour.flatMap((value, hour) => {
      const rounded = Math.round(value);
      if (rounded === 0 && !triggerHours[hour]) return [];
      const item = t('usage.item', {
        label: t('spoken.hours', { count: hour }),
        value: spoken(rounded),
      });
      return [triggerHours[hour] ? t('hours.triggerItem', { item }) : item];
    });
    body = (
      <>
        <Text variant="bodyStrong">
          {t('hours.peak', { from: hourLabel(peakHour), to: hourLabel((peakHour + 1) % 24) })}
        </Text>
        <HourColumns
          testID="stats-hours"
          values={hourly.minutesByHour}
          highlighted={triggerHours}
          hourLabel={hourLabel}
          description={describe(t('hours.chart'), items)}
        />
        {triggerHours.some(Boolean) ? <TriggerLegend label={t('hours.triggerLegend')} /> : null}
      </>
    );
  }

  return (
    <Card testID="stats-hours-card">
      <Text variant="heading" accessibilityRole="header">
        {t('hours.title')}
      </Text>
      <Text variant="caption" color="textMuted">
        {t('hours.caption')}
      </Text>
      {body}
    </Card>
  );
}

function RecoveredCard({ stats }: { stats: ModerationStats }) {
  const { t } = useTranslation('stats');
  const { short } = useDurations();
  const { recovered } = stats;
  return (
    <Card testID="stats-recovered">
      <Text variant="heading" accessibilityRole="header">
        {t('recovered.title')}
      </Text>
      {recovered.status === 'ready' ? (
        <>
          <Text variant="bodyStrong">
            {t('recovered.total', { duration: short(recovered.totalMinutes) })}
          </Text>
          <Text>{t('recovered.week', { duration: short(recovered.weekMinutes) })}</Text>
          <Text variant="caption" color="textMuted">
            {recovered.source === 'before_start'
              ? t('recovered.baselineBeforeStart', {
                  duration: short(recovered.baselineMinutesPerDay),
                })
              : t('recovered.baselineFirstWeek', {
                  duration: short(recovered.baselineMinutesPerDay),
                })}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('recovered.explanation')}
          </Text>
        </>
      ) : recovered.status === 'pending' ? (
        <Text color="textMuted">
          {t('recovered.pending', { date: fullDate(recovered.availableFromDayKey) })}
        </Text>
      ) : (
        <Text color="textMuted">{t('recovered.unknown')}</Text>
      )}
    </Card>
  );
}

/** Respeitados e ignorados das telas de interrupção (só as telas: a notificação não tem botões). */
function InterruptionLines({ summary }: { summary: InterruptionSummary }) {
  const { t } = useTranslation('stats');
  return (
    <>
      <Text>{t('alerts.screens', { count: summary.total })}</Text>
      {summary.total > 0 ? (
        <>
          <View>
            <Text variant="bodyStrong">{t('alerts.respected', { count: summary.respected })}</Text>
            <Text variant="caption" color="textMuted">
              {t('alerts.respectedHint')}
            </Text>
          </View>
          <View>
            <Text variant="bodyStrong">{t('alerts.ignored', { count: summary.ignored })}</Text>
            <Text variant="caption" color="textMuted">
              {t('alerts.ignoredHint')}
            </Text>
          </View>
          {summary.unanswered > 0 ? (
            <Text color="textMuted">{t('alerts.unanswered', { count: summary.unanswered })}</Text>
          ) : null}
        </>
      ) : null}
    </>
  );
}

function AlertsCard({ summary }: { summary: InterruptionSummary }) {
  const { t } = useTranslation('stats');
  return (
    <Card testID="stats-alerts">
      <Text variant="heading" accessibilityRole="header">
        {t('alerts.title')}
      </Text>
      <InterruptionLines summary={summary} />
    </Card>
  );
}

function DaysCard({ stats }: { stats: ModerationStats }) {
  const { t } = useTranslation('stats');
  return (
    <Card testID="stats-days">
      <Text variant="heading" accessibilityRole="header">
        {t('days.title')}
      </Text>
      <Text variant="bodyStrong">{t('days.approved', { count: stats.days.approved })}</Text>
      <Text variant="bodyStrong">{t('days.failed', { count: stats.days.failed })}</Text>
      <Text variant="caption" color="textMuted">
        {t('days.explanation')}
      </Text>
    </Card>
  );
}

function StreaksCard({ streaks, relapses }: { streaks: StreakStats; relapses?: number }) {
  const { t } = useTranslation('stats');
  const theme = useTheme();
  const days = (count: number) => t('streaks.days', { count });
  return (
    <Card testID="stats-streaks">
      <Text variant="heading" accessibilityRole="header">
        {t('streaks.title')}
      </Text>
      <Text variant="bodyStrong">{t('streaks.current', { days: days(streaks.current) })}</Text>
      <Text variant="bodyStrong">{t('streaks.longest', { days: days(streaks.longest) })}</Text>
      {relapses !== undefined ? <Text>{t('streaks.relapses', { count: relapses })}</Text> : null}
      <Text variant="caption" color="textMuted">
        {t('streaks.history')}
      </Text>
      <View style={{ gap: theme.spacing.xs }}>
        {streaks.sequences.map((sequence) => (
          <Text key={sequence.startDayKey} testID={`stats-sequence-${sequence.startDayKey}`}>
            {sequence.endDayKey === null
              ? t('streaks.itemCurrent', {
                  from: fullDate(sequence.startDayKey),
                  days: days(sequence.days),
                })
              : t('streaks.item', {
                  from: fullDate(sequence.startDayKey),
                  to: fullDate(sequence.endDayKey),
                  days: days(sequence.days),
                })}
          </Text>
        ))}
      </View>
    </Card>
  );
}

function CheckInsCard({ stats }: { stats: AbstinenceStats }) {
  const { t } = useTranslation('stats');
  const { checkIns } = stats;
  return (
    <Card testID="stats-check-ins">
      <Text variant="heading" accessibilityRole="header">
        {t('checkIns.title')}
      </Text>
      <Text variant="bodyStrong">{t('checkIns.answered', { count: checkIns.total })}</Text>
      {checkIns.total > 0 ? (
        <Text color="textMuted">
          {t('checkIns.breakdown', { noRelapse: checkIns.noRelapse, relapse: checkIns.relapse })}
        </Text>
      ) : null}
    </Card>
  );
}

function RiskAppsCard({ stats }: { stats: AbstinenceStats }) {
  const { t } = useTranslation(['stats', 'common']);
  const { describe } = useDurations();
  const hourLabel = (hour: number) => t('common:time.hour', { hour });
  const byHour = stats.notificationsByHour.map(
    (count, hour) => count + (stats.interruptionsByHour[hour] ?? 0),
  );
  const items = byHour.flatMap((total, hour) => {
    if (total === 0 && !stats.triggerHours[hour]) return [];
    const item = t('usage.item', {
      label: t('spoken.hours', { count: hour }),
      value: t('riskApps.hourValue', {
        notifications: t('riskApps.spokenNotifications', {
          count: stats.notificationsByHour[hour] ?? 0,
        }),
        screens: t('riskApps.spokenScreens', { count: stats.interruptionsByHour[hour] ?? 0 }),
      }),
    });
    return [stats.triggerHours[hour] ? t('hours.triggerItem', { item }) : item];
  });
  const any = byHour.some((total) => total > 0);

  return (
    <Card testID="stats-risk-apps">
      <Text variant="heading" accessibilityRole="header">
        {t('riskApps.title')}
      </Text>
      <Text variant="bodyStrong">
        {t('riskApps.notifications', { count: stats.notifications })}
      </Text>
      <InterruptionLines summary={stats.interruptions} />
      <Text variant="caption" color="textMuted">
        {t('riskApps.historyNote')}
      </Text>
      {any ? (
        <>
          <Text variant="bodyStrong">{t('riskApps.hoursTitle')}</Text>
          <HourColumns
            testID="stats-risk-hours"
            values={byHour}
            highlighted={stats.triggerHours}
            hourLabel={hourLabel}
            description={describe(t('riskApps.chart'), items)}
          />
          {stats.triggerHours.some(Boolean) ? (
            <TriggerLegend label={t('hours.triggerLegend')} />
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

function GeneralSection({ stats }: { stats: ReturnType<typeof loadStats>['emergency'] }) {
  const { t } = useTranslation('stats');
  return (
    <Card testID="stats-general">
      <Text variant="heading" accessibilityRole="header">
        {t('general.title')}
      </Text>
      <Text variant="bodyStrong">{t('general.emergency', { count: stats.total })}</Text>
      {stats.total > 0 ? (
        <>
          <Text>{t('general.fromHome', { count: stats.bySource.home })}</Text>
          <Text>{t('general.fromInterruption', { count: stats.bySource.interruption })}</Text>
          <Text>{t('general.fromNotification', { count: stats.bySource.notification })}</Text>
        </>
      ) : null}
      <Text variant="bodyStrong">{t('general.victories', { count: stats.victories })}</Text>
    </Card>
  );
}
