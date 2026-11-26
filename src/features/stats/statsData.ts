import type { Repositories, UserCompulsion } from '@/data/repositories';
import { computeRecovered, type BaselineSource } from '@/domain/baseline';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { getDailyLimitToday } from '@/domain/dailyLimit';
import { toDayKey } from '@/domain/day';
import {
  countByHour,
  countDayResults,
  countVictories,
  getDailyUsage,
  getHourlyAverage,
  getPeakHour,
  getStreakStats,
  getTriggerHours,
  getWeeklyUsage,
  listUsageApps,
  summarizeCheckIns,
  summarizeEmergency,
  summarizeInterruptions,
  type CheckInSummary,
  type DayResults,
  type DayUsage,
  type EmergencySummary,
  type HourlyAverage,
  type InterruptionSummary,
  type StreakStats,
  type VictorySummary,
  type UsageInput,
  type WeekUsage,
} from '@/domain/statistics';
import { parseTimeRange, type TimeRange } from '@/domain/timeRange';
import { getBreakDayKeys } from '@/features/milestones/milestoneData';
import { evaluateBaseline, minutesByDay } from '@/features/usage/usageHistorySync';

// Ponte entre o banco e as regras das estatísticas (spec 04, 5.8). As contas
// ficam em src/domain/statistics.ts; aqui só se lê o banco e se junta o
// resultado para a aba.

export type RecoveredStats =
  | {
      readonly status: 'ready';
      readonly baselineMinutesPerDay: number;
      readonly source: BaselineSource;
      readonly totalMinutes: number;
      readonly weekMinutes: number;
    }
  /** O ponto de partida ainda não pode ser calculado: aparece a partir do dia. */
  | { readonly status: 'pending'; readonly availableFromDayKey: string }
  /** Nenhum histórico importado ainda (ex.: sem o acesso ao uso). */
  | { readonly status: 'unknown' };

export type ModerationStats = {
  readonly mechanic: 'moderation';
  readonly compulsion: UserCompulsion;
  /** Apps com uso no histórico, do mais usado ao menos usado (filtro por app). */
  readonly apps: readonly string[];
  /** O app do filtro, se ele ainda estiver na lista; null = todos. */
  readonly appPackage: string | null;
  readonly dailyLimitMinutes: number | null;
  readonly daily: readonly DayUsage[];
  readonly weekly: readonly WeekUsage[];
  readonly hourly: HourlyAverage;
  readonly peakHour: number | null;
  readonly triggerHours: readonly boolean[];
  readonly recovered: RecoveredStats;
  readonly interruptions: InterruptionSummary;
  readonly days: DayResults;
  readonly streaks: StreakStats;
};

export type AbstinenceStats = {
  readonly mechanic: 'abstinence';
  readonly compulsion: UserCompulsion;
  readonly streaks: StreakStats;
  readonly relapses: number;
  readonly checkIns: CheckInSummary;
  /** Avisos por notificação dos apps de risco. */
  readonly notifications: number;
  /** Telas de interrupção dos apps de risco. */
  readonly interruptions: InterruptionSummary;
  /** Avisos e telas por hora (0 a 23). */
  readonly notificationsByHour: readonly number[];
  readonly interruptionsByHour: readonly number[];
  readonly triggerHours: readonly boolean[];
};

export type CompulsionStats = ModerationStats | AbstinenceStats;

export type Stats = {
  readonly compulsions: readonly CompulsionStats[];
  readonly emergency: EmergencySummary;
  readonly victories: VictorySummary;
};

/** Faixas de horário declaradas que valem para a compulsão (as gerais e as dela). */
function timeRangesOf(repositories: Repositories, compulsionId: number): TimeRange[] {
  return repositories.triggers
    .list()
    .filter(
      (trigger) =>
        trigger.kind === 'time' &&
        (trigger.compulsionId === null || trigger.compulsionId === compulsionId),
    )
    .map((trigger) => parseTimeRange(trigger.value))
    .filter((range): range is TimeRange => range !== null);
}

function streaksOf(repositories: Repositories, compulsion: UserCompulsion, now: Date) {
  return getStreakStats({
    startedAt: compulsion.startedAt,
    eventDayKeys: getBreakDayKeys(repositories, compulsion),
    now,
  });
}

function recoveredOf(
  repositories: Repositories,
  compulsion: UserCompulsion,
  coveredDayKeys: ReadonlySet<string>,
  now: Date,
): RecoveredStats {
  let baseline: { minutes: number; source: BaselineSource } | null = null;
  if (compulsion.baselineMinutesPerDay !== null && compulsion.baselineSource !== null) {
    baseline = { minutes: compulsion.baselineMinutesPerDay, source: compulsion.baselineSource };
  } else {
    // Ainda não guardado: a próxima sincronização guarda; até lá, o mesmo cálculo.
    const result = evaluateBaseline(repositories, compulsion, now);
    if (result === null) return { status: 'unknown' };
    if (result.status === 'pending') {
      return { status: 'pending', availableFromDayKey: result.availableFromDayKey };
    }
    baseline = { minutes: result.minutesPerDay, source: result.source };
  }
  const minutes = minutesByDay(repositories, compulsion.id);
  const recovered = computeRecovered({
    baselineMinutesPerDay: baseline.minutes,
    startDayKey: toDayKey(compulsion.startedAt),
    todayKey: toDayKey(now),
    coveredDayKeys,
    minutesOn: (day) => minutes.get(day) ?? 0,
  });
  return {
    status: 'ready',
    baselineMinutesPerDay: baseline.minutes,
    source: baseline.source,
    ...recovered,
  };
}

function moderationStats(
  repositories: Repositories,
  compulsion: UserCompulsion,
  now: Date,
  appFilter: string | null,
): ModerationStats {
  const todayKey = toDayKey(now);
  const coveredDayKeys = new Set(repositories.usageHistory.listCoveredDayKeys());
  const rows = repositories.usageHistory.listByCompulsion(compulsion.id);
  const apps = listUsageApps(rows);
  const appPackage = appFilter !== null && apps.includes(appFilter) ? appFilter : null;
  const usage: UsageInput = { rows, coveredDayKeys, todayKey, appPackage };
  const hourly = getHourlyAverage(usage);
  return {
    mechanic: 'moderation',
    compulsion,
    apps,
    appPackage,
    dailyLimitMinutes: getDailyLimitToday(compulsion, todayKey),
    daily: getDailyUsage(usage),
    weekly: getWeeklyUsage(usage),
    hourly,
    peakHour: getPeakHour(hourly.minutesByHour),
    triggerHours: getTriggerHours(timeRangesOf(repositories, compulsion.id)),
    recovered: recoveredOf(repositories, compulsion, coveredDayKeys, now),
    interruptions: summarizeInterruptions(
      repositories.monitoringEvents.listInterruptions(compulsion.id).map((event) => event.response),
    ),
    days: countDayResults({
      startedAt: compulsion.startedAt,
      failedDayKeys: repositories.dayStates.listFailedDayKeys(compulsion.id),
      now,
    }),
    streaks: streaksOf(repositories, compulsion, now),
  };
}

function abstinenceStats(
  repositories: Repositories,
  compulsion: UserCompulsion,
  now: Date,
): AbstinenceStats {
  const screens = repositories.monitoringEvents.listInterruptions(compulsion.id);
  // Só os avisos dos apps de risco: a abstinência não tem limite somado.
  const alerts = repositories.monitoringEvents
    .listAlerts(compulsion.id)
    .filter((alert) => alert.kind === 'risk_app');
  return {
    mechanic: 'abstinence',
    compulsion,
    streaks: streaksOf(repositories, compulsion, now),
    relapses: repositories.relapses
      .listByCompulsion(compulsion.id)
      .filter((relapse) => relapse.dayKey <= toDayKey(now)).length,
    checkIns: summarizeCheckIns(
      repositories.checkIns.listByCompulsion(compulsion.id).map((checkIn) => checkIn.answer),
    ),
    notifications: alerts.length,
    interruptions: summarizeInterruptions(screens.map((event) => event.response)),
    notificationsByHour: countByHour(alerts.map((alert) => alert.sentAt)),
    interruptionsByHour: countByHour(screens.map((event) => event.shownAt)),
    triggerHours: getTriggerHours(timeRangesOf(repositories, compulsion.id)),
  };
}

/**
 * Tudo o que a aba Estatísticas mostra: cada compulsão ativa, na ordem do
 * Início, e a seção geral. `appFilter`: o app escolhido no filtro de uso da
 * moderação (null = todos).
 */
export function loadStats(
  repositories: Repositories,
  now: Date,
  appFilter: string | null = null,
): Stats {
  const compulsions = repositories.compulsions
    .list()
    .filter((compulsion) => compulsion.status === 'active')
    .map((compulsion) =>
      getCompulsionDefinition(compulsion.type).mechanic === 'moderation'
        ? moderationStats(repositories, compulsion, now, appFilter)
        : abstinenceStats(repositories, compulsion, now),
    );
  const sessions = repositories.emergencySessions.list();
  return {
    compulsions,
    emergency: summarizeEmergency(sessions),
    // As telas de todas as compulsões: a vitória é do usuário, não de uma compulsão.
    victories: countVictories({
      emergencyOutcomes: sessions.map((session) => session.outcome),
      interruptionResponses: repositories.compulsions
        .list()
        .flatMap((compulsion) => repositories.monitoringEvents.listInterruptions(compulsion.id))
        .map((event) => event.response),
    }),
  };
}
