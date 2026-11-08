import type { QuedoMonitoringNativeModule } from '../../modules/monitoring-android';

import { AndroidMonitoringSync } from './AndroidMonitoringSync';
import { MonitoringError, type MonitoringConfig } from './types';

const CONFIG: MonitoringConfig = {
  version: 1,
  compulsions: [],
  moderationRules: [],
  riskAppRules: [],
  checkInMinutes: null,
  checkInCompulsionId: null,
  restartDayKeys: [],
  links: { permissions: 'quedo-dev://permission-status' },
  preventive: { weekdays: [], startMinutes: [], emotions: [] },
  motivation: null,
  texts: {
    channels: { tracking: 'a', alerts: 'b', reminders: 'c' },
    ongoing: { title: 'd', text: 'e' },
    notifications: {
      public: { title: 'a', text: 'b' },
      emergencyAction: 'c',
      limit: { title: 'd', text: 'e' },
      riskApp: { title: 'd', text: 'e' },
      checkIn: { title: 'd', text: 'e', noRelapse: 'f', relapse: 'g' },
      preventive: {
        title: 'd',
        generic: 'e',
        withMotivation: 'f',
        byEmotion: {
          boredom: 'a',
          loneliness: 'b',
          stress: 'c',
          anxiety: 'd',
          tiredness: 'e',
          sadness: 'f',
        },
      },
      restart: { title: 'd', text: 'e' },
      protectionPaused: { title: 'd', text: 'e' },
    },
    interruption: {
      brand: 'a',
      title: 'b',
      phrases: ['c'],
      motivationLabel: 'd',
      emergency: 'e',
      home: 'f',
      continue: 'g',
      ignoreToday: 'h',
      endOfDayWarning: 'i',
    },
  },
};

function native(overrides: Partial<QuedoMonitoringNativeModule> = {}) {
  return {
    configure: jest.fn(async (_json: string) => undefined),
    getPendingEvents: jest.fn(async () => '[]'),
    acknowledgeEvents: jest.fn(async (_ids: string[]) => undefined),
    reset: jest.fn(async () => undefined),
    ...overrides,
  } as unknown as jest.Mocked<QuedoMonitoringNativeModule>;
}

it('envia a configuração como JSON', async () => {
  const module = native();
  await new AndroidMonitoringSync(module).configure(CONFIG);
  expect(JSON.parse(module.configure.mock.calls[0]![0])).toEqual(CONFIG);
});

it('configuração recusada pelo nativo vira MonitoringError invalid_config', async () => {
  const module = native({
    configure: jest.fn(async () => {
      throw Object.assign(new Error('Invalid monitoring configuration'), {
        code: 'ERR_INVALID_CONFIG',
      });
    }),
  });
  const error = await new AndroidMonitoringSync(module).configure(CONFIG).catch((e) => e);
  expect(error).toBeInstanceOf(MonitoringError);
  expect(error).toMatchObject({ code: 'invalid_config' });
});

it('lê os eventos do JSON do nativo, conferidos', async () => {
  const module = native({
    getPendingEvents: jest.fn(async () =>
      JSON.stringify([
        { id: 'a', at: 1, dayKey: '2026-11-07', type: 'service_started', origin: 'restart' },
        { id: 'b', at: 1, dayKey: '2026-11-07', type: 'desconhecido' },
      ]),
    ),
  });
  expect(await new AndroidMonitoringSync(module).getPendingEvents()).toEqual({
    events: [{ id: 'a', at: 1, dayKey: '2026-11-07', type: 'service_started', origin: 'restart' }],
    invalidIds: ['b'],
  });
});

it('JSON ilegível do nativo vira lista vazia', async () => {
  const module = native({ getPendingEvents: jest.fn(async () => '{') });
  expect(await new AndroidMonitoringSync(module).getPendingEvents()).toEqual({
    events: [],
    invalidIds: [],
  });
});

it('confirmar sem ids não chama o nativo', async () => {
  const module = native();
  const sync = new AndroidMonitoringSync(module);
  await sync.acknowledgeEvents([]);
  expect(module.acknowledgeEvents).not.toHaveBeenCalled();
  await sync.acknowledgeEvents(['a']);
  expect(module.acknowledgeEvents).toHaveBeenCalledWith(['a']);
});
