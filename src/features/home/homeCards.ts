import type { Repositories, UserCompulsion } from '@/data/repositories';
import { getCompulsionDefinition } from '@/domain/compulsion';
import { getDailyLimitToday } from '@/domain/dailyLimit';
import { toDayKey } from '@/domain/day';
import {
  getAbstinenceOverview,
  getModerationOverview,
  type AbstinenceOverview,
  type StreakOverview,
} from '@/domain/overview';

export type HomeCard =
  | { kind: 'abstinence'; compulsion: UserCompulsion; overview: AbstinenceOverview }
  | {
      kind: 'moderation';
      compulsion: UserCompulsion;
      overview: StreakOverview;
      packageNames: string[];
      dailyLimitMinutes: number;
    };

/**
 * Um card por compulsão ativa, na ordem em que foram escolhidas (spec 02,
 * seção 4.5): a ordem de inserção, que o repositório devolve.
 */
export function loadHomeCards(repositories: Repositories, now: Date): HomeCard[] {
  return repositories.compulsions
    .list()
    .filter((compulsion) => compulsion.status === 'active')
    .map((compulsion): HomeCard => {
      if (getCompulsionDefinition(compulsion.type).mechanic === 'abstinence') {
        return {
          kind: 'abstinence',
          compulsion,
          overview: getAbstinenceOverview({
            startedAt: compulsion.startedAt,
            checkIns: repositories.checkIns.listByCompulsion(compulsion.id),
            relapses: repositories.relapses.listByCompulsion(compulsion.id),
            now,
          }),
        };
      }
      return {
        kind: 'moderation',
        compulsion,
        overview: getModerationOverview({
          startedAt: compulsion.startedAt,
          failedDayKeys: repositories.dayStates.listFailedDayKeys(compulsion.id),
          now,
        }),
        packageNames: repositories.monitoredApps
          .listByCompulsion(compulsion.id)
          .map((app) => app.packageName),
        // O limite em vigor: no dia de um aumento, ainda o antigo.
        dailyLimitMinutes: getDailyLimitToday(compulsion, toDayKey(now)) ?? 0,
      };
    });
}
