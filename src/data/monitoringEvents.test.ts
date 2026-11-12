import { asTargetId, type MonitoringEvent } from '@/monitoring/types';

import { createRepositories, type Repositories } from './repositories';
import { createTestDatabase, query, type TestDatabase } from './testing';

// Importação dos eventos do nativo (spec 03, seção 4.3). Fuso de São Paulo
// (jest.global-setup.js): 07/11/2026, 10:00 local.
const NOW = new Date('2026-11-07T13:00:00.000Z');
const EVENT_AT = new Date('2026-11-07T12:30:00.000Z').getTime();
const DAY = '2026-11-07';

let database: TestDatabase;
let repositories: Repositories;
let adult: number;
let videos: number;

const count = (table: string) =>
  query(database.raw, `SELECT count(*) FROM ${table}`)[0]?.[0] as number;

let nextId = 1;
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
function event(body: DistributiveOmit<MonitoringEvent, 'id' | 'at' | 'dayKey'>): MonitoringEvent {
  return { id: `ev-${nextId++}`, at: EVENT_AT, dayKey: DAY, ...body } as MonitoringEvent;
}

const clips = asTargetId('com.example.clips');

beforeEach(async () => {
  database = await createTestDatabase();
  repositories = createRepositories(database.db, () => NOW);
  adult = repositories.compulsions.add({ type: 'pornography', startedAt: NOW }).id;
  videos = repositories.compulsions.add({
    type: 'short_videos',
    startedAt: NOW,
    dailyLimitMinutes: 30,
  }).id;
  nextId = 1;
});

it('zerar o dia apaga as telas e as contagens dele, e eventos novos voltam a contar', () => {
  const shown = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
  repositories.monitoringEvents.importEvents([shown]);
  expect(count('interruption_events')).toBe(1);

  repositories.dayStates.clearDay(DAY);
  expect(count('interruption_events')).toBe(0);
  expect(repositories.dayStates.listByCompulsion(videos)).toEqual([]);

  repositories.monitoringEvents.importEvents([
    event({ type: 'interruption_shown', compulsionId: videos, targetId: clips }),
  ]);
  expect(repositories.dayStates.listByCompulsion(videos)[0]?.interruptions).toBe(1);
});

describe('importEvents', () => {
  it('"Tive uma recaída" pela notificação grava a recaída e o check-in do dia, como pelo app', () => {
    const answered = event({ type: 'check_in_answered', compulsionId: adult, answer: 'relapse' });
    expect(repositories.monitoringEvents.importEvents([answered])).toEqual({
      handledIds: [answered.id],
      failed: 0,
    });
    expect(repositories.checkIns.listByCompulsion(adult)).toEqual([
      expect.objectContaining({
        dayKey: DAY,
        answer: 'relapse',
        source: 'notification',
        answeredAt: new Date(EVENT_AT),
      }),
    ]);
    expect(repositories.relapses.listByCompulsion(adult)).toEqual([
      expect.objectContaining({ dayKey: DAY, recordedAt: new Date(EVENT_AT) }),
    ]);
  });

  it('"Sem recaída" pela notificação grava o check-in com a origem da notificação', () => {
    repositories.monitoringEvents.importEvents([
      event({ type: 'check_in_answered', compulsionId: adult, answer: 'no_relapse' }),
    ]);
    expect(repositories.checkIns.listByCompulsion(adult)).toEqual([
      expect.objectContaining({ answer: 'no_relapse', source: 'notification' }),
    ]);
    expect(repositories.relapses.listByCompulsion(adult)).toEqual([]);
  });

  it('importar duas vezes não duplica nem soma de novo', () => {
    const shown = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
    const answered = event({ type: 'check_in_answered', compulsionId: adult, answer: 'relapse' });
    repositories.monitoringEvents.importEvents([shown, answered]);
    // O nativo não chegou a apagar: os mesmos eventos voltam.
    const again = repositories.monitoringEvents.importEvents([shown, answered]);
    expect(again).toEqual({ handledIds: [shown.id, answered.id], failed: 0 });
    expect(count('interruption_events')).toBe(1);
    expect(repositories.dayStates.listByCompulsion(videos)[0]?.interruptions).toBe(1);
    expect(count('imported_events')).toBe(2);
  });

  it('tela exibida grava a interrupção e soma ao dia; a resposta completa a mesma linha', () => {
    const first = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
    const second = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
    repositories.monitoringEvents.importEvents([
      first,
      event({
        type: 'interruption_response',
        interruptionId: first.id,
        compulsionId: videos,
        response: 'continue',
      }),
      second,
      event({
        type: 'interruption_response',
        interruptionId: second.id,
        compulsionId: videos,
        response: 'home',
      }),
    ]);

    expect(repositories.monitoringEvents.listInterruptions(videos)).toEqual([
      {
        id: first.id,
        compulsionId: videos,
        dayKey: DAY,
        shownAt: new Date(EVENT_AT),
        response: 'continue',
        respondedAt: new Date(EVENT_AT),
        appPackage: 'com.example.clips',
      },
      expect.objectContaining({ id: second.id, response: 'home' }),
    ]);
    expect(repositories.dayStates.listByCompulsion(videos)).toEqual([
      expect.objectContaining({ dayKey: DAY, interruptions: 2, continues: 1, failed: false }),
    ]);
  });

  it('só a primeira resposta de uma tela vale', () => {
    const shown = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
    const respond = (response: 'continue' | 'home') =>
      event({
        type: 'interruption_response',
        interruptionId: shown.id,
        compulsionId: videos,
        response,
      });
    repositories.monitoringEvents.importEvents([shown, respond('continue'), respond('continue')]);
    expect(repositories.dayStates.listByCompulsion(videos)[0]?.continues).toBe(1);
  });

  it('resposta de uma tela que não foi importada não faz nada', () => {
    repositories.monitoringEvents.importEvents([
      event({
        type: 'interruption_response',
        interruptionId: 'nunca-vista',
        compulsionId: videos,
        response: 'continue',
      }),
    ]);
    expect(count('day_states')).toBe(0);
    expect(count('imported_events')).toBe(1);
  });

  it('dia reprovado grava o motivo; as contagens do dia continuam', () => {
    repositories.monitoringEvents.importEvents([
      event({ type: 'interruption_shown', compulsionId: videos, targetId: clips }),
      event({ type: 'day_failed', compulsionId: videos, reason: 'third_continue' }),
    ]);
    expect(repositories.dayStates.listByCompulsion(videos)).toEqual([
      expect.objectContaining({ interruptions: 1, failed: true, failedReason: 'third_continue' }),
    ]);
    expect(repositories.dayStates.listFailedDayKeys(videos)).toEqual([DAY]);
  });

  it('a tela de um app de risco conta na compulsão de abstinência, sem reprovar nada', () => {
    repositories.monitoringEvents.importEvents([
      event({
        type: 'interruption_shown',
        compulsionId: adult,
        targetId: asTargetId('com.example.forum'),
      }),
    ]);
    expect(repositories.dayStates.listByCompulsion(adult)).toEqual([
      expect.objectContaining({ interruptions: 1, failed: false }),
    ]);
  });

  it('eventos de uma compulsão apagada são confirmados sem efeito', () => {
    repositories.compulsions.remove(videos);
    const shown = event({ type: 'interruption_shown', compulsionId: videos, targetId: clips });
    const failed = event({ type: 'day_failed', compulsionId: videos, reason: 'ignored_limit' });
    expect(repositories.monitoringEvents.importEvents([shown, failed])).toEqual({
      handledIds: [shown.id, failed.id],
      failed: 0,
    });
    expect(count('interruption_events')).toBe(0);
    expect(count('day_states')).toBe(0);
  });

  it('um evento que falha não trava a fila: os outros entram e ele fica confirmado', () => {
    // Reprovar um dia na abstinência é recusado pelo repositório.
    const wrong = event({ type: 'day_failed', compulsionId: adult, reason: 'ignored_limit' });
    const good = event({ type: 'check_in_answered', compulsionId: adult, answer: 'no_relapse' });
    expect(repositories.monitoringEvents.importEvents([wrong, good])).toEqual({
      handledIds: [wrong.id, good.id],
      failed: 1,
    });
    expect(count('day_states')).toBe(0);
    expect(repositories.checkIns.listByCompulsion(adult)).toHaveLength(1);
    // Não volta a falhar na próxima importação.
    expect(repositories.monitoringEvents.importEvents([wrong]).failed).toBe(0);
  });

  it('eventos sem tabela própria ficam só como importados', () => {
    repositories.monitoringEvents.importEvents([
      event({ type: 'service_started', origin: 'boot' }),
      event({ type: 'limit_reached', compulsionId: videos, targetId: null }),
      event({ type: 'notification_sent', kind: 'limit' }),
      event({ type: 'emergency_requested', source: 'interruption' }),
      event({ type: 'permission_lost', permission: 'usageAccess' }),
    ]);
    expect(count('imported_events')).toBe(5);
    for (const table of ['interruption_events', 'day_states', 'check_ins', 'emergency_sessions']) {
      expect(count(table)).toBe(0);
    }
  });

  it('apagar todos os dados apaga também as interrupções, as sessões e os importados', () => {
    repositories.monitoringEvents.importEvents([
      event({ type: 'interruption_shown', compulsionId: videos, targetId: clips }),
    ]);
    database.raw.run("INSERT INTO emergency_sessions (started_at, source) VALUES (0, 'home')");
    repositories.deleteAllData();
    for (const table of ['interruption_events', 'emergency_sessions', 'imported_events']) {
      expect(count(table)).toBe(0);
    }
  });
});
