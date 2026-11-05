// O que o card de cada compulsão mostra na tela Início (spec 02, seção 4.5;
// doc 01, seções 6.1 e 6.2). Junta as regras de streak e de check-in num
// resumo do dia, para a interface só desenhar.
import {
  canUndo,
  getRelapseDayKey,
  getRelapseDayOptions,
  getTodayCheckInStatus,
  type CheckInAnswer,
  type RelapseDay,
} from './checkIn';
import { getNextMilestone, getStreakDays } from './streak';

export type StreakOverview = {
  readonly streakDays: number;
  /** Próximo marco em dias, ou null depois do último. */
  readonly nextMilestone: number | null;
};

export type AbstinenceOverviewInput = {
  readonly startedAt: Date;
  readonly checkIns: readonly {
    readonly dayKey: string;
    readonly answer: CheckInAnswer;
    readonly answeredAt: Date;
  }[];
  readonly relapses: readonly { readonly dayKey: string; readonly recordedAt: Date }[];
  readonly now: Date;
};

export type AbstinenceOverview = StreakOverview & {
  readonly checkIn:
    | { readonly state: 'pending' }
    | { readonly state: 'answered'; readonly answer: CheckInAnswer; readonly canUndo: boolean };
  /** Recaída de ontem registrada hoje: ainda pode ser desfeita (spec 02 v0.2, 4.3). */
  readonly yesterdayRelapseUndoable: boolean;
  /** Dias que "Registrar recaída" oferece, sem os que já têm recaída. */
  readonly relapseDays: readonly RelapseDay[];
  /** Alguma recaída foi registrada hoje: o card mostra a mensagem de apoio (P8). */
  readonly relapseRecordedToday: boolean;
};

function streakOverview(startedAt: Date, eventDayKeys: readonly string[], now: Date) {
  const streakDays = getStreakDays({ startedAt, eventDayKeys, now });
  return { streakDays, nextMilestone: getNextMilestone(streakDays) };
}

export function getAbstinenceOverview(input: AbstinenceOverviewInput): AbstinenceOverview {
  const { startedAt, checkIns, relapses, now } = input;
  const todayKey = getRelapseDayKey('today', now);
  const yesterdayKey = getRelapseDayKey('yesterday', now);
  const relapseOn = (dayKey: string) => relapses.find((relapse) => relapse.dayKey === dayKey);

  const status = getTodayCheckInStatus(checkIns, now);
  const todayCheckIn = checkIns.find((checkIn) => checkIn.dayKey === todayKey);
  const yesterdayRelapse = relapseOn(yesterdayKey);
  const dayKeys = { today: todayKey, yesterday: yesterdayKey } satisfies Record<RelapseDay, string>;

  return {
    ...streakOverview(
      startedAt,
      relapses.map((relapse) => relapse.dayKey),
      now,
    ),
    checkIn:
      status.state === 'answered' && todayCheckIn
        ? { ...status, canUndo: canUndo(todayCheckIn.answeredAt, now) }
        : { state: 'pending' },
    yesterdayRelapseUndoable:
      yesterdayRelapse !== undefined && canUndo(yesterdayRelapse.recordedAt, now),
    relapseDays: getRelapseDayOptions(startedAt, now).filter(
      (day) => relapseOn(dayKeys[day]) === undefined,
    ),
    relapseRecordedToday: relapses.some((relapse) => canUndo(relapse.recordedAt, now)),
  };
}

export type ModerationOverviewInput = {
  readonly startedAt: Date;
  /** Dias reprovados (`day_states.failed`). */
  readonly failedDayKeys: readonly string[];
  readonly now: Date;
};

export function getModerationOverview(input: ModerationOverviewInput): StreakOverview {
  return streakOverview(input.startedAt, input.failedDayKeys, input.now);
}

const MS_PER_MINUTE = 60 * 1000;

/**
 * Minutos de hoje somados entre os apps escolhidos (limite somado, doc 01,
 * 6.5.4), arredondados para baixo: "42 min de 60" só vira 43 com o minuto
 * completo. Apps fora da lista não contam.
 */
export function sumUsageMinutes(
  entries: readonly { readonly targetId: string; readonly milliseconds: number }[],
  packageNames: readonly string[],
): number {
  const total = entries
    .filter((entry) => packageNames.includes(entry.targetId))
    .reduce((sum, entry) => sum + entry.milliseconds, 0);
  return Math.floor(total / MS_PER_MINUTE);
}
