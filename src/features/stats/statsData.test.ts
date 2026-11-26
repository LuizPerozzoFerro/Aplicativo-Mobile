import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import type { HourlyRow } from '@/domain/usageHistory';
import { asTargetId, type MonitoringEvent } from '@/monitoring/types';

import { loadStats, type AbstinenceStats, type ModerationStats } from './statsData';

// Estatísticas lidas do banco (spec 04, 5.8). Fuso de São Paulo
// (jest.global-setup.js). Hoje: 26/11/2026, 15:00 local.
const NOW = new Date(2026, 10, 26, 15, 0);
const TODAY = '2026-11-26';

let repositories: Repositories;
let nextId = 1;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
function event(
  at: Date,
  dayKey: string,
  body: DistributiveOmit<MonitoringEvent, 'id' | 'at' | 'dayKey'>,
): MonitoringEvent {
  return { id: `ev-${nextId++}`, at: at.getTime(), dayKey, ...body } as MonitoringEvent;
}

beforeEach(async () => {
  repositories = createRepositories((await createTestDatabase()).db, () => NOW);
  nextId = 1;
});

function addVideos(startedAt = new Date(2026, 10, 10, 9, 0)) {
  return repositories.compulsions.add({ type: 'short_videos', startedAt, dailyLimitMinutes: 30 });
}

function addAdult(startedAt = new Date(2026, 10, 1, 9, 0)) {
  const adult = repositories.compulsions.add({ type: 'pornography', startedAt });
  repositories.compulsions.setInitialStreakDays(adult.id, 0);
  return adult;
}

function importUsage(compulsionId: number, days: Record<string, [number, number, string][]>) {
  repositories.usageHistory.importDays(
    [compulsionId],
    Object.entries(days).map(([dayKey, rows]) => ({
      dayKey,
      covered: true,
      rows: rows.map(([hour, seconds, appPackage]): HourlyRow => ({
        dayKey,
        hour,
        compulsionId,
        appPackage,
        seconds,
      })),
    })),
  );
}

const moderation = (stats = loadStats(repositories, NOW)) =>
  stats.compulsions.find((item): item is ModerationStats => item.mechanic === 'moderation')!;
const abstinence = (stats = loadStats(repositories, NOW)) =>
  stats.compulsions.find((item): item is AbstinenceStats => item.mechanic === 'abstinence')!;

describe('vídeos curtos (moderação)', () => {
  it('uso por dia e por semana, horários, faixas de gatilho, dias e sequências', () => {
    const videos = addVideos();
    importUsage(videos.id, {
      '2026-11-24': [[21, 1800, 'a']],
      '2026-11-25': [
        [21, 600, 'a'],
        [8, 600, 'b'],
      ],
      [TODAY]: [[9, 300, 'a']],
    });
    const other = addAdult();
    repositories.triggers.replaceAll([
      { kind: 'time', value: '21:00-22:00', compulsionId: videos.id },
      // De outra compulsão: não destaca nada aqui.
      { kind: 'time', value: '03:00-04:00', compulsionId: other.id },
      { kind: 'weekday', value: '6' },
    ]);
    repositories.dayStates.markFailed(
      { compulsionId: videos.id, dayKey: '2026-11-20' },
      'ignored_limit',
    );

    const stats = moderation();
    expect(stats.apps).toEqual(['a', 'b']);
    expect(stats.dailyLimitMinutes).toBe(30);
    expect(stats.daily.map((day) => day.minutes)).toEqual([null, null, null, null, 30, 20, 5]);
    expect(stats.weekly.at(-1)).toMatchObject({ minutes: 55, coveredDays: 3 });
    expect(stats.hourly.days).toBe(2);
    expect(stats.hourly.minutesByHour[21]).toBe(20);
    expect(stats.peakHour).toBe(21);
    expect(stats.triggerHours.flatMap((on, hour) => (on ? [hour] : []))).toEqual([21]);
    // De 10/11 a 25/11: 16 dias terminados, um reprovado.
    expect(stats.days).toEqual({ approved: 15, failed: 1 });
    expect(stats.streaks).toMatchObject({ current: 6, longest: 10 });
  });

  it('filtro por app; um app que saiu do histórico volta para todos', () => {
    const videos = addVideos();
    importUsage(videos.id, {
      [TODAY]: [
        [9, 600, 'a'],
        [9, 300, 'b'],
      ],
    });
    expect(moderation(loadStats(repositories, NOW, 'b'))).toMatchObject({ appPackage: 'b' });
    expect(moderation(loadStats(repositories, NOW, 'b')).daily.at(-1)?.minutes).toBe(5);
    expect(moderation(loadStats(repositories, NOW, 'z'))).toMatchObject({ appPackage: null });
    expect(moderation(loadStats(repositories, NOW, 'z')).daily.at(-1)?.minutes).toBe(15);
  });

  it('tempo recuperado com o ponto de partida guardado: só os dias com histórico', () => {
    const videos = addVideos(new Date(2026, 10, 20, 9, 0));
    repositories.compulsions.setBaseline(videos.id, 40, 'before_start');
    importUsage(videos.id, {
      '2026-11-21': [[9, 600, 'a']], // 10 min: 30 recuperados
      '2026-11-22': [[9, 3000, 'a']], // 50 min: acima, não desconta
      '2026-11-25': [], // sem uso: 40 recuperados
      [TODAY]: [[9, 60, 'a']], // hoje ainda não entra
    });
    expect(moderation().recovered).toEqual({
      status: 'ready',
      baselineMinutesPerDay: 40,
      source: 'before_start',
      totalMinutes: 70,
      weekMinutes: 70,
    });
  });

  it('ponto de partida pendente mostra a data; sem histórico nenhum, desconhecido', () => {
    const videos = addVideos(new Date(2026, 10, 20, 9, 0));
    expect(moderation().recovered).toEqual({ status: 'unknown' });

    repositories.settings.setUsageHistorySince('2026-11-25');
    importUsage(videos.id, { '2026-11-25': [], [TODAY]: [] });
    expect(moderation().recovered).toEqual({
      status: 'pending',
      availableFromDayKey: '2026-12-03',
    });
  });

  it('alertas respeitados e ignorados vêm das telas de interrupção', () => {
    const videos = addVideos();
    const clips = asTargetId('com.example.clips');
    const at = new Date(2026, 10, 25, 21, 10);
    const shown = [1, 2, 3].map(() =>
      event(at, '2026-11-25', {
        type: 'interruption_shown',
        compulsionId: videos.id,
        targetId: clips,
      }),
    );
    repositories.monitoringEvents.importEvents([
      ...shown,
      event(at, '2026-11-25', {
        type: 'interruption_response',
        interruptionId: shown[0]!.id,
        compulsionId: videos.id,
        response: 'home',
      }),
      event(at, '2026-11-25', {
        type: 'interruption_response',
        interruptionId: shown[1]!.id,
        compulsionId: videos.id,
        response: 'continue',
      }),
    ]);
    expect(moderation().interruptions).toEqual({
      total: 3,
      respected: 1,
      ignored: 1,
      unanswered: 1,
    });
  });
});

describe('conteúdo adulto (abstinência)', () => {
  it('sequências, recaídas, check-ins e os avisos dos apps de risco por hora', () => {
    const adult = addAdult();
    repositories.relapses.record({ compulsionId: adult.id, dayKey: '2026-11-12' });
    repositories.checkIns.answer({
      compulsionId: adult.id,
      dayKey: '2026-11-20',
      answer: 'no_relapse',
    });
    repositories.triggers.replaceAll([{ kind: 'time', value: '22:00-00:00' }]);
    const forum = asTargetId('com.example.forum');
    const night = new Date(2026, 10, 25, 22, 15);
    repositories.monitoringEvents.importEvents([
      event(night, '2026-11-25', {
        type: 'limit_reached',
        compulsionId: adult.id,
        targetId: forum,
      }),
      event(new Date(2026, 10, 25, 22, 40), '2026-11-25', {
        type: 'interruption_shown',
        compulsionId: adult.id,
        targetId: forum,
      }),
      event(new Date(2026, 10, 24, 8, 0), '2026-11-24', {
        type: 'limit_reached',
        compulsionId: adult.id,
        targetId: forum,
      }),
    ]);

    const stats = abstinence();
    expect(stats.streaks).toMatchObject({ current: 14, longest: 14 });
    expect(stats.streaks.sequences).toHaveLength(2);
    expect(stats.relapses).toBe(1);
    // A recaída grava o check-in do dia como "recaída".
    expect(stats.checkIns).toEqual({ total: 2, noRelapse: 1, relapse: 1 });
    expect(stats.notifications).toBe(2);
    expect(stats.interruptions).toMatchObject({ total: 1, unanswered: 1 });
    expect(stats.notificationsByHour[22]).toBe(1);
    expect(stats.notificationsByHour[8]).toBe(1);
    expect(stats.interruptionsByHour[22]).toBe(1);
    expect(stats.triggerHours.flatMap((on, hour) => (on ? [hour] : []))).toEqual([22, 23]);
  });
});

describe('geral', () => {
  it('emergência: vezes, origem e vitórias; compulsão pausada não aparece', () => {
    const adult = addAdult();
    repositories.compulsions.setStatus(adult.id, 'paused');
    const first = repositories.emergencySessions.start('home');
    repositories.emergencySessions.finish(first.id, 'passed');
    const second = repositories.emergencySessions.start('interruption');
    repositories.emergencySessions.finish(second.id, 'not_passed');

    const stats = loadStats(repositories, NOW);
    expect(stats.compulsions).toEqual([]);
    expect(stats.emergency).toEqual({
      total: 2,
      bySource: { home: 1, interruption: 1, notification: 0 },
      victories: 1,
    });
  });
});
