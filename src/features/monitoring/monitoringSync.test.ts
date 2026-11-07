import { createRepositories, type Repositories } from '@/data/repositories';
import { createTestDatabase } from '@/data/testing';
import { FakeMonitoringModule, type MonitoringTexts } from '@/monitoring';

import { createMonitoringSync } from './monitoringSync';

const NOW = new Date('2026-11-07T13:00:00.000Z');
const TEXTS: MonitoringTexts = {
  channels: { tracking: 'a', alerts: 'b', reminders: 'c' },
  ongoing: { title: 'd', text: 'e' },
};

let repositories: Repositories;
let fake: FakeMonitoringModule;
let report: jest.Mock;

beforeEach(async () => {
  const { db } = await createTestDatabase();
  repositories = createRepositories(db, () => NOW);
  fake = new FakeMonitoringModule({ now: () => NOW });
  report = jest.fn();
});

const createSync = (target = fake) =>
  createMonitoringSync({
    repositories: () => repositories,
    target: () => target,
    texts: () => TEXTS,
    now: () => NOW,
    report,
  });

it('importa os eventos, confirma ao nativo e depois envia a configuração do banco atualizado', async () => {
  const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
  fake.simulateEvent({ type: 'check_in_answered', compulsionId: id, answer: 'no_relapse' });

  await createSync().sync();

  expect(repositories.checkIns.listByCompulsion(id)).toHaveLength(1);
  expect((await fake.getPendingEvents()).events).toEqual([]);
  // A configuração já vê o check-in importado.
  expect(fake.getLastConfig()?.compulsions).toEqual([
    expect.objectContaining({ id, checkInAnsweredDayKey: '2026-11-07' }),
  ]);
  expect(report).not.toHaveBeenCalled();
});

it('se a importação falhar, não confirma nada ao nativo', async () => {
  const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
  fake.simulateEvent({ type: 'check_in_answered', compulsionId: id, answer: 'relapse' });
  jest.spyOn(repositories.monitoringEvents, 'importEvents').mockImplementation(() => {
    throw new Error('banco indisponível');
  });

  await createSync().sync();

  expect((await fake.getPendingEvents()).events).toHaveLength(1);
  expect(fake.getLastConfig()).toBeNull();
  expect(report).toHaveBeenCalledWith('Monitoramento: falha ao sincronizar');
});

it('apaga do nativo também os eventos malformados e avisa só a contagem', async () => {
  const target = {
    getPendingEvents: jest.fn(async () => ({ events: [], invalidIds: ['x', 'y'] })),
    acknowledgeEvents: jest.fn(async () => undefined),
    configure: jest.fn(async () => undefined),
    reset: jest.fn(async () => undefined),
  };
  await createSync(target as unknown as FakeMonitoringModule).sync();
  expect(target.acknowledgeEvents).toHaveBeenCalledWith(['x', 'y']);
  expect(report).toHaveBeenCalledWith('Monitoramento: 0 evento(s) sem efeito e 2 malformado(s)');
});

it('sem eventos, não toca no banco nem confirma, mas envia a configuração', async () => {
  const importSpy = jest.spyOn(repositories.monitoringEvents, 'importEvents');
  const ackSpy = jest.spyOn(fake, 'acknowledgeEvents');
  await createSync().sync();
  expect(importSpy).not.toHaveBeenCalled();
  expect(ackSpy).not.toHaveBeenCalled();
  expect(fake.getLastConfig()).not.toBeNull();
});

it('pedidos durante uma rodada viram uma rodada a mais, nunca duas ao mesmo tempo', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const configure = jest.spyOn(fake, 'configure').mockImplementation(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
  });
  const sync = createSync();
  await Promise.all([sync.sync(), sync.sync(), sync.sync()]);
  expect(maxInFlight).toBe(1);
  expect(configure).toHaveBeenCalledTimes(2);
});
