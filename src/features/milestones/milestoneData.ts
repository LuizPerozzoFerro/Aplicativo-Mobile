import type { MilestoneReach, Repositories, UserCompulsion } from '@/data/repositories';
import type { Catalog, CatalogMilestone } from '@/domain/catalog';
import { getCompulsionDefinition, type CompulsionType } from '@/domain/compulsion';
import { toDayKey } from '@/domain/day';
import {
  findMilestone,
  getMilestoneDays,
  getMilestoneTimeline,
  isReachAgain,
  planMilestoneReaches,
  type StreakHistory,
  type TimelineItem,
} from '@/domain/milestones';
import { getNextMilestone, getStreakDays } from '@/domain/streak';

// Ponte entre o banco, o catálogo e as regras dos marcos (spec 04, 5.3 e 5.4).

/** Quebras da compulsão: recaídas na abstinência, dias reprovados na moderação. */
export function getBreakDayKeys(repositories: Repositories, compulsion: UserCompulsion): string[] {
  return getCompulsionDefinition(compulsion.type).mechanic === 'abstinence'
    ? repositories.relapses.listByCompulsion(compulsion.id).map((relapse) => relapse.dayKey)
    : repositories.dayStates.listFailedDayKeys(compulsion.id);
}

function historyOf(
  repositories: Repositories,
  compulsion: UserCompulsion,
  now: Date,
): StreakHistory {
  return {
    startedAt: compulsion.startedAt,
    eventDayKeys: getBreakDayKeys(repositories, compulsion),
    now,
  };
}

/** Compulsões que alcançam marcos: só as ativas (pausada, na Fase 6, não alcança). */
function activeCompulsions(repositories: Repositories): UserCompulsion[] {
  return repositories.compulsions.list().filter((compulsion) => compulsion.status === 'active');
}

/**
 * Põe os alcances em dia com a história de cada compulsão ativa e registra a
 * conferência do dia. Só grava o que mudou: rodar de novo não grava nada
 * (importante, porque cada gravação avisa `dataChanges`).
 */
export function reconcileMilestones(repositories: Repositories, catalog: Catalog, now: Date): void {
  const checkedOn = repositories.settings.get().milestonesCheckedOn;
  for (const compulsion of activeCompulsions(repositories)) {
    const plan = planMilestoneReaches({
      ...historyOf(repositories, compulsion, now),
      initialStreakDays: compulsion.initialStreakDays,
      milestoneDays: getMilestoneDays(catalog, compulsion.type),
      checkedOn,
      stored: repositories.milestoneReaches.listByCompulsion(compulsion.id),
    });
    // Só chama quando há o que gravar: toda chamada de gravação avisa `dataChanges`,
    // mesmo vazia, e quem assina (Início, monitoramento, esta conferência) reage.
    if (plan.add.length > 0) repositories.milestoneReaches.addMany(compulsion.id, plan.add);
    if (plan.silence.length > 0) repositories.milestoneReaches.markCelebrated(plan.silence);
  }
  const today = toDayKey(now);
  if (checkedOn !== today) repositories.settings.setMilestonesCheckedOn(today);
}

export type Celebration = {
  readonly reachId: number;
  readonly compulsionType: CompulsionType;
  readonly day: number;
  /** Título do marco no catálogo; null se o catálogo não tiver o marco (lista de reserva). */
  readonly title: string | null;
  /** Mesmo marco já alcançado numa sequência anterior ("de novo"). */
  readonly again: boolean;
};

/** Alcances que ainda esperam a tela de celebração, do mais antigo ao mais novo. */
export function loadCelebrations(repositories: Repositories, catalog: Catalog): Celebration[] {
  const pending = repositories.milestoneReaches.listPending();
  if (pending.length === 0) return [];
  const compulsions = new Map(
    repositories.compulsions.list().map((compulsion) => [compulsion.id, compulsion]),
  );
  const reachesOf = new Map<number, MilestoneReach[]>();
  const result: Celebration[] = [];
  for (const reach of pending) {
    const compulsion = compulsions.get(reach.compulsionId);
    if (compulsion === undefined) continue;
    let all = reachesOf.get(compulsion.id);
    if (all === undefined) {
      all = repositories.milestoneReaches.listByCompulsion(compulsion.id);
      reachesOf.set(compulsion.id, all);
    }
    result.push({
      reachId: reach.id,
      compulsionType: compulsion.type,
      day: reach.milestoneDay,
      title: findMilestone(catalog, compulsion.type, reach.milestoneDay)?.title ?? null,
      again: isReachAgain(reach, all),
    });
  }
  return result;
}

export type CompulsionProgress = {
  readonly compulsion: UserCompulsion;
  readonly streakDays: number;
  /** Próximo marco em dias, ou null depois do último. */
  readonly nextMilestone: number | null;
  /** O catálogo tem esta compulsão; sem ele, a aba mostra um estado vazio (5.4). */
  readonly hasContent: boolean;
  readonly timeline: readonly (TimelineItem & { readonly milestone: CatalogMilestone | null })[];
};

/** O que a aba Progresso mostra de cada compulsão ativa, na ordem do Início. */
export function loadProgress(
  repositories: Repositories,
  catalog: Catalog,
  now: Date,
): CompulsionProgress[] {
  return activeCompulsions(repositories).map((compulsion) => {
    const milestoneDays = getMilestoneDays(catalog, compulsion.type);
    const streakDays = getStreakDays(historyOf(repositories, compulsion, now));
    const timeline = getMilestoneTimeline({
      milestoneDays,
      streakDays,
      reaches: repositories.milestoneReaches.listByCompulsion(compulsion.id),
    });
    return {
      compulsion,
      streakDays,
      nextMilestone: getNextMilestone(streakDays, milestoneDays),
      hasContent: (catalog.compulsions[compulsion.type]?.milestones.length ?? 0) > 0,
      timeline: timeline.map((item) => ({
        ...item,
        milestone: findMilestone(catalog, compulsion.type, item.day),
      })),
    };
  });
}

export type MilestoneDetail = {
  readonly compulsion: UserCompulsion;
  readonly milestone: CatalogMilestone;
  readonly unlocked: boolean;
};

/** Detalhe de um marco (5.4), ou null se a compulsão ou o marco não existirem mais. */
export function loadMilestoneDetail(
  repositories: Repositories,
  catalog: Catalog,
  type: CompulsionType,
  day: number,
  now: Date,
): MilestoneDetail | null {
  const compulsion = repositories.compulsions.list().find((item) => item.type === type);
  const milestone = findMilestone(catalog, type, day);
  if (compulsion === undefined || milestone === null) return null;
  const streakDays = getStreakDays(historyOf(repositories, compulsion, now));
  const unlocked =
    day <= streakDays ||
    repositories.milestoneReaches
      .listByCompulsion(compulsion.id)
      .some((reach) => reach.milestoneDay === day);
  return { compulsion, milestone, unlocked };
}
