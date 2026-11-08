import { createDataChanges, isReadMethod, observeRepositories } from './changes';
import { createRepositories } from './repositories';
import { createTestDatabase } from './testing';

const NOW = new Date('2026-11-07T13:00:00.000Z');

// Funções que gravam, conferidas uma a uma: uma função nova com nome de
// leitura que grave (ou o contrário) aparece aqui como diferença.
const WRITES = [
  'settings.setOnboardingCompleted',
  'settings.setAgeConfirmedAt',
  'settings.setOnboardingStep',
  'settings.setCheckInMinutes',
  'compulsions.add',
  'compulsions.setStatus',
  'compulsions.setStartedAt',
  'compulsions.setDailyLimit',
  'compulsions.changeDailyLimit',
  'compulsions.setInitialStreakDays',
  'compulsions.remove',
  'monitoredApps.add',
  'monitoredApps.replaceForCompulsion',
  'monitoredApps.remove',
  'triggers.add',
  'triggers.replaceAll',
  'triggers.remove',
  'motivation.save',
  'checkIns.answer',
  'checkIns.undo',
  'relapses.record',
  'relapses.undo',
  'dayStates.markFailed',
  'monitoringEvents.importEvents',
  'emergencySessions.start',
  'emergencySessions.finish',
  'emergencySessions.abandonOpen',
  'deleteAllData',
];

async function setup() {
  const { db } = await createTestDatabase();
  const onChange = jest.fn();
  const repositories = observeRepositories(
    createRepositories(db, () => NOW),
    onChange,
  );
  return { repositories, onChange };
}

it('a regra de nomes separa exatamente as funções que gravam', async () => {
  const { db } = await createTestDatabase();
  const repositories = createRepositories(db, () => NOW);
  const names = Object.entries(repositories).flatMap(([name, value]) =>
    typeof value === 'function'
      ? [name]
      : Object.keys(value as object).map((method) => `${name}.${method}`),
  );
  const writes = names.filter((name) => !isReadMethod(name.split('.').at(-1) ?? name));
  expect(writes.sort()).toEqual([...WRITES].sort());
});

it('avisa depois de gravar, e não ao ler', async () => {
  const { repositories, onChange } = await setup();
  repositories.compulsions.list();
  repositories.settings.get();
  expect(onChange).not.toHaveBeenCalled();

  const { id } = repositories.compulsions.add({ type: 'pornography', startedAt: NOW });
  expect(onChange).toHaveBeenCalledTimes(1);
  repositories.checkIns.answer({ compulsionId: id, dayKey: '2026-11-07', answer: 'no_relapse' });
  repositories.deleteAllData();
  expect(onChange).toHaveBeenCalledTimes(3);
});

it('gravação que falha não avisa e o erro continua chegando a quem chamou', async () => {
  const { repositories, onChange } = await setup();
  expect(() =>
    repositories.checkIns.answer({ compulsionId: 999, dayKey: '2026-11-07', answer: 'relapse' }),
  ).toThrow();
  expect(onChange).not.toHaveBeenCalled();
});

it('os avisos chegam a cada assinante até cancelar', () => {
  const changes = createDataChanges();
  const first = jest.fn();
  const second = jest.fn();
  const cancel = changes.subscribe(first);
  changes.subscribe(second);
  changes.notify();
  cancel();
  changes.notify();
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(2);
});
