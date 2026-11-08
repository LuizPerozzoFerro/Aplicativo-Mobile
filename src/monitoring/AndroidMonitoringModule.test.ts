import type { QuedoMonitoringNativeModule } from '../../modules/monitoring-android';

import { PermissionsAndroid } from 'react-native';

import { AndroidMonitoringModule } from './AndroidMonitoringModule';
import { MonitoringError, UNSUPPORTED, type MonitoringConfig } from './types';

const CONFIG: MonitoringConfig = {
  version: 1,
  compulsions: [],
  moderationRules: [],
  riskAppRules: [],
  checkInMinutes: null,
  checkInCompulsionId: null,
  restartDayKeys: [],
  links: {
    permissions: 'quedo-dev://permission-status',
    emergencyFromNotification: 'quedo-dev://emergency?source=notification',
    emergencyFromInterruption: 'quedo-dev://emergency?source=interruption',
  },
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
  await new AndroidMonitoringModule(module).configure(CONFIG);
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
  const error = await new AndroidMonitoringModule(module)
    .configure(CONFIG)
    .catch((e: unknown) => e);
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
  expect(await new AndroidMonitoringModule(module).getPendingEvents()).toEqual({
    events: [{ id: 'a', at: 1, dayKey: '2026-11-07', type: 'service_started', origin: 'restart' }],
    invalidIds: ['b'],
  });
});

it('JSON ilegível do nativo vira lista vazia', async () => {
  const module = native({ getPendingEvents: jest.fn(async () => '{') });
  expect(await new AndroidMonitoringModule(module).getPendingEvents()).toEqual({
    events: [],
    invalidIds: [],
  });
});

it('confirmar sem ids não chama o nativo', async () => {
  const module = native();
  const sync = new AndroidMonitoringModule(module);
  await sync.acknowledgeEvents([]);
  expect(module.acknowledgeEvents).not.toHaveBeenCalled();
  await sync.acknowledgeEvents(['a']);
  expect(module.acknowledgeEvents).toHaveBeenCalledWith(['a']);
});

describe('permissões', () => {
  const status = (
    notifications: 'granted' | 'denied',
    usageAccess: 'granted' | 'denied' = 'denied',
  ) => jest.fn(() => ({ usageAccess, notifications, overlay: 'denied' as const }));
  const settings = () => ({
    openUsageAccessSettings: jest.fn(async () => true),
    openOverlaySettings: jest.fn(async () => true),
    openNotificationSettings: jest.fn(async () => true),
  });
  const { GRANTED, DENIED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;

  afterEach(() => jest.restoreAllMocks());

  it('acesso ao uso abre os Ajustes e devolve o estado do momento', async () => {
    const module = native({ ...settings(), getPermissionStatus: status('denied') });
    expect(await new AndroidMonitoringModule(module).requestPermission('usageAccess')).toBe(
      'denied',
    );
    expect(module.openUsageAccessSettings).toHaveBeenCalledTimes(1);
    expect(module.openOverlaySettings).not.toHaveBeenCalled();
  });

  it('sobreposição abre os Ajustes', async () => {
    const module = native({ ...settings(), getPermissionStatus: status('denied') });
    await new AndroidMonitoringModule(module).requestPermission('overlay');
    expect(module.openOverlaySettings).toHaveBeenCalledTimes(1);
  });

  it('notificações usam a janela do sistema', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(GRANTED);
    const module = native({ ...settings(), getPermissionStatus: status('granted') });
    expect(await new AndroidMonitoringModule(module).requestPermission('notifications')).toBe(
      'granted',
    );
    expect(module.openNotificationSettings).not.toHaveBeenCalled();
  });

  it('recusa simples não abre os Ajustes', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(DENIED);
    const module = native({ ...settings(), getPermissionStatus: status('denied') });
    expect(await new AndroidMonitoringModule(module).requestPermission('notifications')).toBe(
      'denied',
    );
    expect(module.openNotificationSettings).not.toHaveBeenCalled();
  });

  it('"não perguntar de novo" leva aos Ajustes', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(NEVER_ASK_AGAIN);
    const module = native({ ...settings(), getPermissionStatus: status('denied') });
    await new AndroidMonitoringModule(module).requestPermission('notifications');
    expect(module.openNotificationSettings).toHaveBeenCalledTimes(1);
  });

  it('permissão dada, mas notificações desligadas nos Ajustes, leva aos Ajustes', async () => {
    jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(GRANTED);
    const module = native({ ...settings(), getPermissionStatus: status('denied') });
    await new AndroidMonitoringModule(module).requestPermission('notifications');
    expect(module.openNotificationSettings).toHaveBeenCalledTimes(1);
  });
});

describe('uso, alvos e serviço', () => {
  const required = () =>
    Object.assign(new Error('Usage access is required'), { code: 'ERR_PERMISSION_REQUIRED' });

  it('lista os apps instalados com o nome', async () => {
    const module = native({ listTargets: jest.fn(async () => [{ id: 'a.b', label: 'App' }]) });
    expect(await new AndroidMonitoringModule(module).listTargets()).toEqual([
      { id: 'a.b', label: 'App' },
    ]);
  });

  it('o seletor da Apple não existe aqui', async () => {
    expect(await new AndroidMonitoringModule(native()).pickTargets()).toBe(UNSUPPORTED);
  });

  it('devolve o uso de hoje', async () => {
    const module = native({
      getUsageToday: jest.fn(async () => [{ targetId: 'a.b', milliseconds: 60_000 }]),
    });
    expect(await new AndroidMonitoringModule(module).getUsageToday()).toEqual([
      { targetId: 'a.b', milliseconds: 60_000 },
    ]);
  });

  it.each(['getUsageToday', 'startMonitoring'] as const)(
    '%s sem o acesso ao uso vira permission_required',
    async (method) => {
      const module = native({
        [method]: jest.fn(async () => {
          throw required();
        }),
      });
      const error = await new AndroidMonitoringModule(module)[method]().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(MonitoringError);
      expect(error).toMatchObject({ code: 'permission_required' });
    },
  );

  it('outro erro do nativo não é disfarçado', async () => {
    const failure = new Error('falhou');
    const module = native({
      startMonitoring: jest.fn(async () => {
        throw failure;
      }),
    });
    await expect(new AndroidMonitoringModule(module).startMonitoring()).rejects.toBe(failure);
  });

  it('expõe só o estado do serviço que a interface pede', async () => {
    const module = native({
      getServiceStatus: jest.fn(() => ({
        active: true,
        running: false,
        serviceStarts: 3,
        serviceStartedAt: 1,
        startRequestedAt: 2,
        checks: 9,
        lastCheckAt: 4,
        lastBootAt: null,
        lastBootResult: null,
        pendingEvents: 0,
      })),
    });
    expect(await new AndroidMonitoringModule(module).getServiceStatus()).toEqual({
      active: true,
      running: false,
      startRequestedAt: 2,
      lastCheckAt: 4,
    });
  });

  it('a vigilância roda no nativo', async () => {
    const module = native({ checkProtection: jest.fn(async () => undefined) });
    await new AndroidMonitoringModule(module).checkProtection();
    expect(module.checkProtection).toHaveBeenCalledTimes(1);
  });
});
