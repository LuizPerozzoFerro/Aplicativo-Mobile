import { observeRepositories } from '@/data/changes';
import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import type { Catalog } from '@/domain/catalog';
import { addCalendarDays, toDayKey } from '@/domain/day';

import {
  loadCelebrations,
  loadMilestoneDetail,
  loadProgress,
  reconcileMilestones,
} from './milestoneData';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js.
const NOW = new Date(2026, 10, 22, 10);
const daysAgo = (days: number) => addCalendarDays(NOW, -days);
const dayKeyAgo = (days: number) => toDayKey(daysAgo(days));

const CATALOG: Catalog = {
  formatVersion: 1,
  contentVersion: 1,
  updatedAt: '2026-11-22',
  compulsions: {
    pornography: {
      milestones: [1, 3, 7, 14].map((day) => ({
        day,
        title: `Marco A ${day}`,
        summary: 'Resumo',
        body: 'Texto',
        references: [],
        free: true,
        video: null,
      })),
    },
  },
};

let repositories: Repositories;
let writes: number;

beforeEach(async () => {
  writes = 0;
  repositories = observeRepositories(
    createRepositories((await createTestDatabase()).db, () => NOW),
    () => (writes += 1),
  );
});

function addAdult(startedDaysAgo: number, initialStreakDays = 0) {
  const adult = repositories.compulsions.add({
    type: 'pornography',
    startedAt: daysAgo(startedDaysAgo),
  });
  repositories.compulsions.setInitialStreakDays(adult.id, initialStreakDays);
  return adult;
}

function addVideos(startedDaysAgo: number) {
  return repositories.compulsions.add({
    type: 'short_videos',
    startedAt: daysAgo(startedDaysAgo),
    dailyLimitMinutes: 60,
  });
}

describe('conferência dos alcances', () => {
  it('primeira vez: grava os do passado celebrados, o de hoje pendente, e o dia da conferência', () => {
    const adult = addAdult(7);
    reconcileMilestones(repositories, CATALOG, NOW);

    const rows = repositories.milestoneReaches.listByCompulsion(adult.id);
    expect(rows.map((row) => [row.milestoneDay, row.celebratedAt === null])).toEqual([
      [1, false],
      [3, false],
      [7, true],
    ]);
    expect(repositories.settings.get().milestonesCheckedOn).toBe(toDayKey(NOW));
  });

  it('rodar de novo não grava nada (cada gravação avisaria dataChanges)', () => {
    addAdult(7);
    addVideos(20);
    reconcileMilestones(repositories, CATALOG, NOW);
    writes = 0;
    reconcileMilestones(repositories, CATALOG, NOW);
    expect(writes).toBe(0);
  });

  it('usa as quebras de cada mecânica: recaídas e dias reprovados', () => {
    const adult = addAdult(20);
    const videos = addVideos(20);
    repositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(0) });
    repositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: dayKeyAgo(3) },
      'ignored_limit',
    );
    reconcileMilestones(repositories, CATALOG, NOW);

    const bases = (id: number) => [
      ...new Set(
        repositories.milestoneReaches.listByCompulsion(id).map((row) => row.streakBaseDay),
      ),
    ];
    expect(bases(adult.id)).toEqual([dayKeyAgo(20)]);
    expect(bases(videos.id)).toEqual([dayKeyAgo(20), dayKeyAgo(3)]);
  });

  it('compulsão pausada não alcança marcos', () => {
    const adult = addAdult(7);
    repositories.compulsions.setStatus(adult.id, 'paused');
    reconcileMilestones(repositories, CATALOG, NOW);
    expect(repositories.milestoneReaches.listByCompulsion(adult.id)).toEqual([]);
  });

  it('a recaída hoje no dia do marco silencia a celebração pendente', () => {
    addAdult(7);
    reconcileMilestones(repositories, CATALOG, NOW);
    expect(repositories.milestoneReaches.listPending()).toHaveLength(1);

    const [adult] = repositories.compulsions.list();
    repositories.relapses.record({ compulsionId: adult!.id, dayKey: dayKeyAgo(0) });
    reconcileMilestones(repositories, CATALOG, NOW);
    expect(repositories.milestoneReaches.listPending()).toEqual([]);
    // O alcance continua: o marco segue desbloqueado.
    expect(repositories.milestoneReaches.listByCompulsion(adult!.id)).toHaveLength(3);
  });
});

describe('celebrações pendentes', () => {
  it('com título do catálogo e "de novo" quando o marco já tinha sido alcançado', () => {
    const adult = addAdult(30);
    repositories.milestoneReaches.addMany(adult.id, [
      { milestoneDay: 3, streakBaseDay: dayKeyAgo(30), reachedOn: dayKeyAgo(27), celebrated: true },
      { milestoneDay: 3, streakBaseDay: dayKeyAgo(3), reachedOn: dayKeyAgo(0), celebrated: false },
    ]);
    const videos = addVideos(30);
    repositories.milestoneReaches.addMany(videos.id, [
      { milestoneDay: 7, streakBaseDay: dayKeyAgo(7), reachedOn: dayKeyAgo(0), celebrated: false },
    ]);

    expect(loadCelebrations(repositories, CATALOG)).toEqual([
      { reachId: 2, compulsionType: 'pornography', day: 3, title: 'Marco A 3', again: true },
      // Sem a compulsão no catálogo: sem título (a tela esconde "Ver o marco").
      { reachId: 3, compulsionType: 'short_videos', day: 7, title: null, again: false },
    ]);
  });

  it('sem pendências, lista vazia', () => {
    addAdult(2);
    expect(loadCelebrations(repositories, CATALOG)).toEqual([]);
  });
});

describe('aba Progresso', () => {
  it('streak, próximo marco e linha do tempo com o marco desbloqueado antes', () => {
    const adult = addAdult(20);
    reconcileMilestones(repositories, CATALOG, daysAgo(3));
    // Recaída há 2 dias: a sequência atual tem 2 dias; 7 e 14 ficaram desbloqueados antes.
    repositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(2) });
    reconcileMilestones(repositories, CATALOG, NOW);

    const [progress] = loadProgress(repositories, CATALOG, NOW);
    expect(progress).toMatchObject({ streakDays: 2, nextMilestone: 3, hasContent: true });
    expect(
      progress?.timeline.map((item) => [
        item.day,
        item.status,
        item.unlocked,
        item.milestone?.title,
      ]),
    ).toEqual([
      [1, 'reached', true, 'Marco A 1'],
      [3, 'next', true, 'Marco A 3'],
      [7, 'future', true, 'Marco A 7'],
      [14, 'future', true, 'Marco A 14'],
    ]);
  });

  it('compulsão fora do catálogo: sem conteúdo, com a lista de reserva', () => {
    addVideos(4);
    const [progress] = loadProgress(repositories, CATALOG, NOW);
    expect(progress).toMatchObject({ streakDays: 4, nextMilestone: 7, hasContent: false });
    expect(progress?.timeline[0]?.milestone).toBeNull();
  });

  it('só as compulsões ativas, na ordem do Início', () => {
    addVideos(4);
    const adult = addAdult(1);
    expect(loadProgress(repositories, CATALOG, NOW).map((item) => item.compulsion.type)).toEqual([
      'short_videos',
      'pornography',
    ]);
    repositories.compulsions.setStatus(adult.id, 'paused');
    expect(loadProgress(repositories, CATALOG, NOW)).toHaveLength(1);
  });
});

describe('detalhe do marco', () => {
  it('desbloqueado depois de uma quebra continua desbloqueado', () => {
    const adult = addAdult(10);
    reconcileMilestones(repositories, CATALOG, NOW);
    repositories.relapses.record({ compulsionId: adult.id, dayKey: dayKeyAgo(0) });

    expect(loadMilestoneDetail(repositories, CATALOG, 'pornography', 7, NOW)).toMatchObject({
      unlocked: true,
    });
    expect(loadMilestoneDetail(repositories, CATALOG, 'pornography', 14, NOW)).toMatchObject({
      unlocked: false,
    });
  });

  it('compulsão ou marco que não existem: null', () => {
    addAdult(10);
    expect(loadMilestoneDetail(repositories, CATALOG, 'short_videos', 7, NOW)).toBeNull();
    expect(loadMilestoneDetail(repositories, CATALOG, 'pornography', 5, NOW)).toBeNull();
  });
});
