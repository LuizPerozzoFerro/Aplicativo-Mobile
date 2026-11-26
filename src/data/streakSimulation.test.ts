import { getStreakDays } from '@/domain/streak';
import {
  isValidSimulationDays,
  parseSimulationSnapshot,
  planStreakSimulation,
} from '@/domain/streakSimulation';

import { createRepositories, type Repositories } from './repositories';
import { createTestDatabase } from './testing';

// "Simular uma streak" (spec 04, 5.12). Fuso de São Paulo
// (jest.global-setup.js). Hoje: 26/11/2026, 15:00 local.
const NOW = new Date(2026, 10, 26, 15, 0);

let repositories: Repositories;

beforeEach(async () => {
  repositories = createRepositories((await createTestDatabase()).db, () => NOW);
});

const streakOf = (repos: Repositories, id: number) => {
  const compulsion = repos.compulsions.list().find((item) => item.id === id)!;
  const breaks =
    compulsion.type === 'pornography'
      ? repos.relapses.listByCompulsion(id).map((relapse) => relapse.dayKey)
      : repos.dayStates.listFailedDayKeys(id);
  return getStreakDays({ startedAt: compulsion.startedAt, eventDayKeys: breaks, now: NOW });
};

describe('regras', () => {
  it('início em hoje - N; quebras desse dia em diante saem', () => {
    expect(planStreakSimulation(7, NOW)).toEqual({
      startedAt: new Date(2026, 10, 19),
      breaksFromDayKey: '2026-11-19',
    });
    expect(isValidSimulationDays(0)).toBe(true);
    expect(isValidSimulationDays(-1)).toBe(false);
    expect(isValidSimulationDays(1.5)).toBe(false);
    expect(isValidSimulationDays(366)).toBe(false);
    expect(() => planStreakSimulation(400, NOW)).toThrow(RangeError);
  });

  it('o registro guardado é conferido campo a campo', () => {
    expect(parseSimulationSnapshot(null)).toBeNull();
    expect(parseSimulationSnapshot('{')).toBeNull();
    expect(parseSimulationSnapshot('{"version":2}')).toBeNull();
  });
});

describe('abstinência', () => {
  it('streak de 7 com recaídas recentes e "há N dias"; desfazer volta tudo', () => {
    const adult = repositories.compulsions.add({
      type: 'pornography',
      startedAt: new Date(2026, 9, 1, 10, 0),
    });
    repositories.compulsions.setInitialStreakDays(adult.id, 30);
    repositories.checkIns.answer({
      compulsionId: adult.id,
      dayKey: '2026-11-20',
      answer: 'no_relapse',
    });
    // A recaída sobre o "sem recaída" guarda a resposta anterior no check-in.
    repositories.relapses.record({ compulsionId: adult.id, dayKey: '2026-11-20' });
    repositories.relapses.record({ compulsionId: adult.id, dayKey: '2026-11-24' });
    // Antes do novo início: fica.
    repositories.relapses.record({ compulsionId: adult.id, dayKey: '2026-11-10' });
    repositories.milestoneReaches.addMany(adult.id, [
      { milestoneDay: 7, streakBaseDay: '2026-10-01', reachedOn: '2026-10-08', celebrated: true },
    ]);
    const before = {
      compulsion: repositories.compulsions.list()[0],
      relapses: repositories.relapses.listByCompulsion(adult.id),
      checkIns: repositories.checkIns.listByCompulsion(adult.id),
    };

    const snapshot = repositories.streakSimulation.apply(adult.id, 7);
    expect(streakOf(repositories, adult.id)).toBe(7);
    expect(repositories.compulsions.list()[0]).toMatchObject({
      startedAt: new Date(2026, 10, 19),
      initialStreakDays: 0,
    });
    expect(repositories.relapses.listByCompulsion(adult.id).map((item) => item.dayKey)).toEqual([
      '2026-11-10',
    ]);
    expect(snapshot.relapses.map((item) => item.dayKey)).toEqual(['2026-11-20', '2026-11-24']);
    // Passa por JSON, como no armazenamento real.
    const stored = parseSimulationSnapshot(JSON.stringify(snapshot));
    expect(stored).toEqual(snapshot);

    // Alcances gravados durante a simulação saem no desfazer; os de antes ficam.
    repositories.milestoneReaches.addMany(adult.id, [
      { milestoneDay: 7, streakBaseDay: '2026-11-19', reachedOn: TODAY_KEY, celebrated: false },
    ]);
    repositories.streakSimulation.undo(stored!);

    expect(repositories.compulsions.list()[0]).toEqual(before.compulsion);
    // O id interno muda ao recriar a linha; o resto volta igual.
    expect(repositories.relapses.listByCompulsion(adult.id)).toEqual(
      before.relapses.map((relapse) => ({ ...relapse, id: expect.any(Number) })),
    );
    expect(repositories.checkIns.listByCompulsion(adult.id)).toEqual(
      before.checkIns.map((checkIn) => ({ ...checkIn, id: expect.any(Number) })),
    );
    expect(
      repositories.milestoneReaches.listByCompulsion(adult.id).map((reach) => reach.streakBaseDay),
    ).toEqual(['2026-10-01']);
    expect(streakOf(repositories, adult.id)).toBe(2);
  });
});

const TODAY_KEY = '2026-11-26';

describe('moderação', () => {
  it('dias reprovados deixam de contar e voltam; contagens e ponto de partida ficam', () => {
    const videos = repositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(2026, 10, 1, 9, 0),
      dailyLimitMinutes: 30,
    });
    repositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: '2026-11-25' },
      'third_continue',
    );
    const before = repositories.dayStates.listByCompulsion(videos.id);
    expect(streakOf(repositories, videos.id)).toBe(1);

    const snapshot = repositories.streakSimulation.apply(videos.id, 14);
    expect(streakOf(repositories, videos.id)).toBe(14);
    expect(repositories.dayStates.listFailedDayKeys(videos.id)).toEqual([]);
    // Na moderação os "dias sem recair" não existem.
    expect(repositories.compulsions.list()[0]?.initialStreakDays).toBeNull();

    // Calculado durante a simulação: o desfazer volta ao que era (nulo).
    repositories.compulsions.setBaseline(videos.id, 40, 'first_week');
    repositories.streakSimulation.undo(snapshot);
    expect(repositories.dayStates.listByCompulsion(videos.id)).toEqual(before);
    expect(repositories.compulsions.list()[0]).toMatchObject({
      startedAt: new Date(2026, 10, 1, 9, 0),
      baselineMinutesPerDay: null,
      baselineSource: null,
    });
    expect(streakOf(repositories, videos.id)).toBe(1);
  });

  it('streak 0 e compulsão apagada antes do desfazer', () => {
    const videos = repositories.compulsions.add({
      type: 'short_videos',
      startedAt: new Date(2026, 10, 1),
      dailyLimitMinutes: 30,
    });
    const snapshot = repositories.streakSimulation.apply(videos.id, 0);
    expect(streakOf(repositories, videos.id)).toBe(0);
    repositories.compulsions.remove(videos.id);
    expect(() => repositories.streakSimulation.undo(snapshot)).not.toThrow();
    expect(() => repositories.streakSimulation.apply(999, 7)).toThrow('Compulsão não encontrada');
  });
});
