import type { Repositories, UserCompulsion } from '@/data/repositories';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { toDayKey } from '@/domain/day';
import { getPreventiveStartMinutes, RISK_APP_DAILY_LIMIT_MINUTES } from '@/domain/monitoring';
import { getStreakBase } from '@/domain/streak';
import { parseTimeRange, type TimeRange } from '@/domain/timeRange';
import { WEEKDAYS, isEmotion, isWeekday, type Emotion, type Weekday } from '@/domain/triggers';
import {
  MONITORING_CONFIG_VERSION,
  asTargetId,
  type ModerationRuleConfig,
  type MonitoringCompulsionConfig,
  type MonitoringConfig,
  type MonitoringTexts,
  type RiskAppRuleConfig,
} from '@/monitoring';

// Configuração enviada ao nativo (spec 03, seção 4.2), montada do banco. O JS
// é a fonte da configuração e do histórico; o nativo só executa as regras do
// momento com o que recebe aqui.

function compulsionConfig(
  repositories: Repositories,
  compulsion: UserCompulsion,
  now: Date,
): MonitoringCompulsionConfig {
  const abstinence = getCompulsionDefinition(compulsion.type).mechanic === 'abstinence';
  const eventDayKeys = abstinence
    ? repositories.relapses.listByCompulsion(compulsion.id).map((relapse) => relapse.dayKey)
    : repositories.dayStates.listFailedDayKeys(compulsion.id);
  // listByCompulsion vem em ordem de dia: o último é o mais recente.
  const lastCheckIn = abstinence
    ? repositories.checkIns.listByCompulsion(compulsion.id).at(-1)
    : undefined;
  return {
    id: compulsion.id,
    type: compulsion.type,
    streakBaseDayKey: toDayKey(
      getStreakBase({ startedAt: compulsion.startedAt, eventDayKeys, now }),
    ),
    checkInAnsweredDayKey: lastCheckIn?.dayKey ?? null,
  };
}

export function buildMonitoringConfig(
  repositories: Repositories,
  texts: MonitoringTexts,
  now: Date,
): MonitoringConfig {
  // Compulsão pausada não tem regras nem notificações.
  const active = repositories.compulsions.list().filter((item) => item.status === 'active');

  const moderationRules: ModerationRuleConfig[] = [];
  const riskAppRules: RiskAppRuleConfig[] = [];
  for (const compulsion of active) {
    const apps = repositories.monitoredApps.listByCompulsion(compulsion.id);
    if (getCompulsionDefinition(compulsion.type).mechanic === 'moderation') {
      const targetIds = apps
        .filter((app) => app.role === 'short_video')
        .map((app) => asTargetId(app.packageName));
      // Sem apps ou sem limite, não há o que medir.
      if (targetIds.length > 0 && compulsion.dailyLimitMinutes !== null) {
        moderationRules.push({
          compulsionId: compulsion.id,
          targetIds,
          dailyLimitMinutes: compulsion.dailyLimitMinutes,
        });
      }
    } else {
      for (const app of apps.filter((item) => item.role === 'risk')) {
        riskAppRules.push({
          compulsionId: compulsion.id,
          targetId: asTargetId(app.packageName),
          dailyLimitMinutes: RISK_APP_DAILY_LIMIT_MINUTES,
          // Tela de interrupção só onde o usuário declarou consumir (doc 01, 6.5.6).
          interruption: app.declaredConsumption === true,
        });
      }
    }
  }

  const triggers = repositories.triggers.list();
  const ranges = triggers
    .filter((trigger) => trigger.kind === 'time')
    .map((trigger) => parseTimeRange(trigger.value))
    .filter((range): range is TimeRange => range !== null);
  const markedWeekdays = triggers
    .filter((trigger) => trigger.kind === 'weekday')
    .map((trigger) => Number(trigger.value))
    .filter(isWeekday);
  const emotions = triggers
    .filter((trigger) => trigger.kind === 'emotion')
    .map((trigger) => trigger.value)
    .filter(isEmotion);

  const hasAbstinence = active.some(
    (compulsion) => getCompulsionDefinition(compulsion.type).mechanic === 'abstinence',
  );

  return {
    version: MONITORING_CONFIG_VERSION,
    compulsions: active.map((compulsion) => compulsionConfig(repositories, compulsion, now)),
    moderationRules,
    riskAppRules,
    checkInMinutes: hasAbstinence ? repositories.settings.get().checkInMinutes : null,
    preventive: {
      // Nenhum dia marcado vale como todos (spec 03, 5.4).
      weekdays: unique<Weekday>(markedWeekdays.length > 0 ? markedWeekdays : [...WEEKDAYS]).sort(
        (a, b) => a - b,
      ),
      startMinutes: getPreventiveStartMinutes(ranges),
      emotions: unique<Emotion>(emotions),
    },
    motivation: repositories.motivation.get()?.text ?? null,
    texts,
  };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
