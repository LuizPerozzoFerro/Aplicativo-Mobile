import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { addCalendarDays, toDayKey } from '@/domain/day';
import { FakeMonitoringModule, asTargetId, type UsageHistoryDay } from '@/monitoring';

import { createUsageHistorySync } from './usageHistorySync';

// Fuso fixado em America/Sao_Paulo pelo jest.global-setup.js. 25/11/2026, 20:00.
const NOW = new Date(2026, 10, 25, 20);
const dayAgo = (days: number) => toDayKey(addCalendarDays(NOW, -days));
const CLIPS = 'com.example.clips';
const FEED = 'com.example.feed';

const hours = (pairs: Record<number, number>) =>
  Array.from({ length: 24 }, (_, hour) => pairs[hour] ?? 0);
const day = (daysAgo: number, apps: Record<string, number[]>, covered = true): UsageHistoryDay => ({
  dayKey: dayAgo(daysAgo),
  covered,
  apps: Object.fromEntries(Object.entries(apps).map(([id, value]) => [asTargetId(id), value])),
});

let repositories: Repositories;
let fake: FakeMonitoringModule;
let report: jest.Mock;

beforeEach(async () => {
  repositories = createRepositories((await createTestDatabase()).db, () => NOW);
  fake = new FakeMonitoringModule({ now: () => NOW, permissions: { usageAccess: 'granted' } });
  report = jest.fn();
});

const sync = () =>
  createUsageHistorySync({
    repositories: () => repositories,
    target: () => fake,
    now: () => NOW,
    report,
  }).sync();

function addVideos(startedDaysAgo: number) {
  const videos = repositories.compulsions.add({
    type: 'short_videos',
    startedAt: addCalendarDays(NOW, -startedDaysAgo),
    dailyLimitMinutes: 60,
  });
  repositories.monitoredApps.replaceForCompulsion(videos.id, [
    { packageName: CLIPS, role: 'short_video' },
  ]);
  return videos;
}

describe('importação do histórico de uso', () => {
  it('grava por hora só os apps da compulsão, marca os dias com histórico e o dia de início', async () => {
    const videos = addVideos(2);
    fake.simulateUsageHistory([
      day(1, { [CLIPS]: hours({ 9: 600 }), [FEED]: hours({ 9: 900 }) }),
      day(0, { [CLIPS]: hours({ 18: 120 }) }),
      day(15, {}, false),
    ]);
    await sync();

    expect(repositories.usageHistory.listByCompulsion(videos.id)).toEqual([
      { dayKey: dayAgo(1), hour: 9, compulsionId: videos.id, appPackage: CLIPS, seconds: 600 },
      { dayKey: dayAgo(0), hour: 18, compulsionId: videos.id, appPackage: CLIPS, seconds: 120 },
    ]);
    expect(repositories.usageHistory.listCoveredDayKeys()).toEqual([dayAgo(1), dayAgo(0)]);
    expect(repositories.settings.get().usageHistorySince).toBe(dayAgo(0));
    expect(report).not.toHaveBeenCalled();
  });

  it('desconta as telas de interrupção já importadas do banco', async () => {
    const videos = addVideos(2);
    const shownAt = new Date(2026, 10, 24, 9, 10);
    repositories.monitoringEvents.importEvents([
      {
        id: 'tela-1',
        at: shownAt.getTime(),
        dayKey: dayAgo(1),
        type: 'interruption_shown',
        compulsionId: videos.id,
        targetId: asTargetId(CLIPS),
      },
      {
        id: 'resposta-1',
        at: shownAt.getTime() + 2 * 60_000,
        dayKey: dayAgo(1),
        type: 'interruption_response',
        interruptionId: 'tela-1',
        compulsionId: videos.id,
        response: 'home',
      },
    ]);
    fake.simulateUsageHistory([day(1, { [CLIPS]: hours({ 9: 600 }) })]);
    await sync();
    expect(repositories.usageHistory.listByCompulsion(videos.id)[0]?.seconds).toBe(480);
  });

  it('é idempotente: importar de novo substitui o total da mesma hora', async () => {
    const videos = addVideos(2);
    fake.simulateUsageHistory([day(0, { [CLIPS]: hours({ 18: 120 }) })]);
    await sync();
    fake.simulateUsageHistory([day(0, { [CLIPS]: hours({ 18: 300 }) })]);
    await sync();
    await sync();
    expect(repositories.usageHistory.listByCompulsion(videos.id)).toEqual([
      { dayKey: dayAgo(0), hour: 18, compulsionId: videos.id, appPackage: CLIPS, seconds: 300 },
    ]);
  });

  it('sem o acesso ao uso ou sem moderação, não consulta nada', async () => {
    fake = new FakeMonitoringModule({ now: () => NOW });
    const spy = jest.spyOn(fake, 'getUsageHistory');
    addVideos(2);
    await sync();
    expect(spy).not.toHaveBeenCalled();

    fake = new FakeMonitoringModule({ now: () => NOW, permissions: { usageAccess: 'granted' } });
    repositories = createRepositories((await createTestDatabase()).db, () => NOW);
    const spyAgain = jest.spyOn(fake, 'getUsageHistory');
    await sync();
    expect(spyAgain).not.toHaveBeenCalled();
  });
});

describe('ponto de partida', () => {
  it('3 dias com dados antes do início: guarda a média (before_start), uma vez só', async () => {
    const videos = addVideos(1);
    fake.simulateUsageHistory([
      day(3, { [CLIPS]: hours({ 20: 1800 }) }),
      day(4, { [CLIPS]: hours({ 20: 3600 }) }),
      day(5, {}),
    ]);
    await sync();
    expect(repositories.compulsions.list()[0]).toMatchObject({
      id: videos.id,
      baselineMinutesPerDay: 30,
      baselineSource: 'before_start',
    });

    // Mudar os apps ou os números depois não recalcula.
    fake.simulateUsageHistory([day(3, { [CLIPS]: hours({ 20: 60 }) })]);
    await sync();
    expect(repositories.compulsions.list()[0]?.baselineMinutesPerDay).toBe(30);
  });

  it('quem começou antes da Fase 5: fica pendente até a primeira semana depois da instalação', async () => {
    addVideos(30);
    fake.simulateUsageHistory([day(2, { [CLIPS]: hours({ 20: 600 }) }), day(1, {})]);
    await sync();
    expect(repositories.compulsions.list()[0]?.baselineMinutesPerDay).toBeNull();
  });
});
