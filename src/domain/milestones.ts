// Marcos: alcances, desbloqueios, celebração e linha do tempo (spec 04, 5.3 e
// 5.4; doc 01, 6.3 e 6.4). Regras puras: o banco guarda os alcances
// (`milestone_reaches`), e estas funções dizem o que gravar e o que mostrar.
//
// Uma **sequência** vai da base da streak (o início ou o dia de uma quebra) até
// a quebra seguinte. Cada sequência alcança cada marco uma vez, no dia
// base + N. O dia da quebra ainda conta para a sequência que termina nele: um
// marco alcançado de manhã continua alcançado se a recaída (ou o dia
// reprovado) vier no mesmo dia (5.3).

import type { Catalog, CatalogMilestone } from './catalog';
import type { CompulsionType } from './compulsion';
import { addCalendarDays, fromDayKey, startOfDay, toDayKey } from './day';
import { MILESTONE_DAYS } from './streak';

/**
 * Dias dos marcos de uma compulsão: os do catálogo (4.2) ou, se ele não tiver
 * a compulsão, a lista de reserva de `streak.ts`.
 */
export function getMilestoneDays(catalog: Catalog, type: CompulsionType): readonly number[] {
  const milestones = catalog.compulsions[type]?.milestones ?? [];
  return milestones.length > 0 ? milestones.map((milestone) => milestone.day) : MILESTONE_DAYS;
}

/** O marco do catálogo naquele dia, ou null (compulsão fora do catálogo ou dia da reserva). */
export function findMilestone(
  catalog: Catalog,
  type: CompulsionType,
  day: number,
): CatalogMilestone | null {
  return catalog.compulsions[type]?.milestones.find((milestone) => milestone.day === day) ?? null;
}

export type StreakHistory = {
  /** Instante do início (`started_at`): só o dia importa. */
  readonly startedAt: Date;
  /** Abstinência: dias com recaída. Moderação: dias reprovados. */
  readonly eventDayKeys: readonly string[];
  readonly now: Date;
};

export type StreakSegment = {
  /** Dia em que a sequência começa (streak 0): o início ou o dia de uma quebra. */
  readonly baseDayKey: string;
  /** Dia da quebra que encerrou a sequência; null na sequência atual. */
  readonly endDayKey: string | null;
  /** A base é um dia de quebra (recomeço), não um início limpo. */
  readonly baseIsBreak: boolean;
};

/**
 * Sequências da história, da mais antiga à atual, com a mesma regra de
 * `getStreakBase`: eventos antes do início ou no futuro não contam, e um
 * evento no próprio dia do início não abre sequência nova (mas faz dela um
 * recomeço).
 */
export function getStreakSegments(history: StreakHistory): StreakSegment[] {
  const start = startOfDay(history.startedAt);
  const today = startOfDay(history.now);
  const startKey = toDayKey(start);
  const eventKeys = [...new Set(history.eventDayKeys)]
    .map(fromDayKey)
    .filter(
      (day): day is Date =>
        day !== null && day.getTime() >= start.getTime() && day.getTime() <= today.getTime(),
    )
    .sort((a, b) => a.getTime() - b.getTime())
    .map(toDayKey);

  const bases = [startKey, ...eventKeys.filter((key) => key !== startKey)];
  return bases.map((baseDayKey, index) => ({
    baseDayKey,
    endDayKey: bases[index + 1] ?? null,
    baseIsBreak: index > 0 || eventKeys.includes(startKey),
  }));
}

export type ReachKey = {
  readonly milestoneDay: number;
  readonly streakBaseDay: string;
};

export type ExpectedReach = ReachKey & {
  /** Dia em que a sequência chegou ao marco (base + N). */
  readonly reachedOn: string;
};

/** Os alcances que a história produz, até hoje, em cada sequência. */
export function getExpectedReaches(
  segment: StreakSegment,
  milestoneDays: readonly number[],
  now: Date,
): ExpectedReach[] {
  const base = fromDayKey(segment.baseDayKey);
  if (base === null) return [];
  const today = toDayKey(now);
  const reaches: ExpectedReach[] = [];
  for (const milestoneDay of [...milestoneDays].sort((a, b) => a - b)) {
    const reachedOn = toDayKey(addCalendarDays(base, milestoneDay));
    // Chaves AAAA-MM-DD comparam como datas.
    if (reachedOn > today) break;
    if (segment.endDayKey !== null && reachedOn > segment.endDayKey) break;
    reaches.push({ milestoneDay, streakBaseDay: segment.baseDayKey, reachedOn });
  }
  return reaches;
}

export type StoredReach = ReachKey & {
  readonly id: number;
  readonly reachedOn: string;
  readonly celebratedAt: Date | null;
};

export type ReachPlanInput = StreakHistory & {
  /** Abstinência: dias sem recair informados no início ("há N dias"); nulo ou 0 sem eles. */
  readonly initialStreakDays: number | null;
  readonly milestoneDays: readonly number[];
  /**
   * Último dia em que os alcances foram conferidos (`settings`). Nulo na
   * primeira vez (primeira abertura da Fase 5 ou instalação nova).
   */
  readonly checkedOn: string | null;
  /** Alcances já gravados desta compulsão. */
  readonly stored: readonly StoredReach[];
};

export type ReachToAdd = ExpectedReach & {
  /** Gravado já como celebrado: alcance que não ganha a tela de celebração. */
  readonly celebrated: boolean;
};

export type ReachPlan = {
  readonly add: readonly ReachToAdd[];
  /** Alcances ainda não celebrados que não devem mais ganhar a tela (sequência encerrada). */
  readonly silence: readonly number[];
};

const keyOf = (reach: ReachKey) => `${reach.milestoneDay}|${reach.streakBaseDay}`;

/**
 * O que gravar para os alcances ficarem em dia com a história (5.3). Alcances
 * nunca são apagados: quebras e "Desfazer" não desfazem desbloqueios.
 *
 * Um alcance novo ganha a tela de celebração, a menos que:
 * - seja de um dia anterior à última conferência (`checkedOn`; na primeira,
 *   hoje): na primeira abertura da Fase 5, os do passado entram celebrados e
 *   só o de hoje é celebrado; depois, só aparece assim um marco acrescentado
 *   ao catálogo, que não deve virar celebração atrasada;
 * - seja da primeira sequência, até o dia em que o usuário começou no app
 *   (início com "há N dias"): os marcos até N entram desbloqueados;
 * - seja o de 1 dia num recomeço (base num dia de quebra): todo recomeço
 *   alcança o 1 dia, e ele só é celebrado na primeira vez; inclui a recaída
 *   registrada hoje para ontem;
 * - a sequência já tenha terminado (marco alcançado no dia da quebra, ou
 *   antes dela com o app fechado): nada de celebração depois da quebra.
 * Pela última regra, um alcance gravado e ainda não celebrado também é
 * silenciado quando a sequência dele termina (ou deixa de existir).
 */
export function planMilestoneReaches(input: ReachPlanInput): ReachPlan {
  const segments = getStreakSegments(input);
  const today = toDayKey(input.now);
  const cutoff = input.checkedOn ?? today;
  const first = segments[0];
  const began =
    first === undefined
      ? null
      : toDayKey(addCalendarDays(startOfDay(input.startedAt), input.initialStreakDays ?? 0));
  const storedKeys = new Set(input.stored.map(keyOf));

  const add: ReachToAdd[] = [];
  for (const segment of segments) {
    for (const reach of getExpectedReaches(segment, input.milestoneDays, input.now)) {
      if (storedKeys.has(keyOf(reach))) continue;
      const shown =
        reach.reachedOn >= cutoff &&
        !(segment === first && began !== null && reach.reachedOn <= began) &&
        !(reach.milestoneDay === 1 && segment.baseIsBreak) &&
        segment.endDayKey === null;
      add.push({ ...reach, celebrated: !shown });
    }
  }

  const current = segments.at(-1)?.baseDayKey ?? null;
  const silence = input.stored
    .filter((reach) => reach.celebratedAt === null && reach.streakBaseDay !== current)
    .map((reach) => reach.id);

  return { add, silence };
}

export type PendingReach = ReachKey & {
  readonly id: number;
  readonly reachedOn: string;
};

/**
 * Alcance de novo: o mesmo marco já tinha sido alcançado numa sequência
 * anterior ("Você chegou de novo a 7 dias").
 */
export function isReachAgain(
  reach: PendingReach,
  all: readonly (ReachKey & { readonly reachedOn: string })[],
): boolean {
  return all.some(
    (other) =>
      other.milestoneDay === reach.milestoneDay &&
      other.streakBaseDay !== reach.streakBaseDay &&
      other.reachedOn < reach.reachedOn,
  );
}

export type MilestoneStatus = 'reached' | 'next' | 'future';

export type TimelineItem = {
  readonly day: number;
  /** Alcançado nesta sequência, o próximo ou um futuro. */
  readonly status: MilestoneStatus;
  /** Desbloqueado para sempre: alcançado em alguma sequência (5.3). */
  readonly unlocked: boolean;
};

/**
 * Linha do tempo da aba Progresso (5.4), com os quatro estados: alcançado
 * nesta sequência (`reached`); desbloqueado antes (`unlocked` sem `reached`);
 * próximo; futuro.
 */
export function getMilestoneTimeline(input: {
  readonly milestoneDays: readonly number[];
  readonly streakDays: number;
  readonly reaches: readonly { readonly milestoneDay: number }[];
}): TimelineItem[] {
  const days = [...input.milestoneDays].sort((a, b) => a - b);
  const next = days.find((day) => day > input.streakDays) ?? null;
  return days.map((day) => {
    const status: MilestoneStatus =
      day <= input.streakDays ? 'reached' : day === next ? 'next' : 'future';
    return {
      day,
      status,
      unlocked: status === 'reached' || input.reaches.some((reach) => reach.milestoneDay === day),
    };
  });
}
