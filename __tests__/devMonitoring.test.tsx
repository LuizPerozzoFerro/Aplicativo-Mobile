import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import '@/i18n';

import DevMonitoringScreen from '../app/dev-monitoring';
import type { Environment } from '@/config/variant';
import type {
  NativeMomentStatus,
  NativeServiceStatus,
  QuedoMonitoringNativeModule,
} from '../modules/monitoring-android';

const mockVariant = { environment: 'development' as Environment };
jest.mock('@/config/variant', () => ({
  get variant() {
    return { environment: mockVariant.environment, features: { domainMonitoring: false } };
  },
}));

const mockNative: { current: QuedoMonitoringNativeModule | null } = { current: null };
jest.mock('../modules/monitoring-android', () => ({
  ...jest.requireActual('../modules/monitoring-android'),
  getQuedoMonitoring: () => mockNative.current,
}));

const STOPPED: NativeServiceStatus = {
  active: false,
  running: false,
  serviceStarts: 0,
  serviceStartedAt: null,
  checks: 0,
  lastCheckAt: null,
  lastBootAt: null,
  lastBootResult: null,
  pendingEvents: 0,
};

function permissionRequired() {
  return Object.assign(new Error('Usage access is required'), {
    code: 'ERR_PERMISSION_REQUIRED',
  });
}

function fakeNative(usageAccess: boolean): jest.Mocked<QuedoMonitoringNativeModule> {
  let service = STOPPED;
  return {
    getPermissionStatus: jest.fn(() => ({
      usageAccess: usageAccess ? ('granted' as const) : ('denied' as const),
      notifications: 'granted' as const,
      overlay: 'denied' as const,
    })),
    openUsageAccessSettings: jest.fn(async () => true),
    openOverlaySettings: jest.fn(async () => true),
    openNotificationSettings: jest.fn(async () => true),
    listTargets: jest.fn(async () => [
      { id: 'com.instagram.android', label: 'Instagram' },
      { id: 'com.example.notes', label: 'Notas' },
    ]),
    getUsageToday: jest.fn(async () => {
      if (!usageAccess) throw permissionRequired();
      return [
        { targetId: 'com.example.notes', milliseconds: 3 * 60_000 },
        { targetId: 'com.instagram.android', milliseconds: 12 * 60_000 },
      ];
    }),
    startMonitoring: jest.fn(async () => {
      if (!usageAccess) throw permissionRequired();
      service = { ...STOPPED, active: true, running: true, serviceStarts: 1, checks: 4 };
    }),
    stopMonitoring: jest.fn(async () => {
      service = { ...service, active: false, running: false };
    }),
    getServiceStatus: jest.fn(() => service),
    configure: jest.fn(async (_json: string) => undefined),
    getConfig: jest.fn(() => config),
    getMomentStatus: jest.fn(() => JSON.stringify(moment)),
    setTestLimit: jest.fn((minutes: number | null) => {
      moment = { ...moment, testLimitMinutes: minutes };
    }),
    getPendingEvents: jest.fn(async () => '[]'),
    acknowledgeEvents: jest.fn(async (_ids: string[]) => undefined),
    reset: jest.fn(async () => undefined),
  };
}

let config: string | null = null;

const NO_MOMENT: NativeMomentStatus = {
  rules: { dayKey: null, compulsions: {} },
  usage: {},
  foreground: null,
  lastShow: null,
  testLimitMinutes: null,
};
let moment = NO_MOMENT;

const mockSync = jest.fn(async () => undefined);
jest.mock('@/features/monitoring/useMonitoringSync', () => ({
  getAppMonitoringSync: () => ({ sync: mockSync }),
}));

const renderScreen = () =>
  renderRouter(
    { index: () => null, 'dev-monitoring': DevMonitoringScreen },
    { initialUrl: '/dev-monitoring' },
  );

afterEach(() => {
  mockVariant.environment = 'development';
  mockNative.current = null;
  config = null;
  moment = NO_MOMENT;
  mockSync.mockClear();
});

it('sem o módulo nativo (fora do Android), avisa', async () => {
  await renderScreen();
  expect(screen.getByText('O módulo nativo não está neste build.')).toBeOnTheScreen();
});

it('mostra permissões, serviço, apps sugeridos e o uso de hoje, do maior para o menor', async () => {
  mockNative.current = fakeNative(true);
  await renderScreen();

  expect(await screen.findByText('Acesso ao uso: permitido')).toBeOnTheScreen();
  expect(screen.getByText('Aparecer sobre outros apps: negado')).toBeOnTheScreen();
  expect(screen.getByText('Ligado: não')).toBeOnTheScreen();
  expect(screen.getByText('Verificações: 0 (última: nunca)')).toBeOnTheScreen();
  expect(screen.getByText('Instagram: instalado')).toBeOnTheScreen();
  expect(screen.getByText('com.kwai.video: não instalado')).toBeOnTheScreen();

  const rows = screen.getAllByText(/: \d+ min$/).map((node) => node.props.children);
  expect(rows).toEqual(['Instagram: 12 min', 'Notas: 3 min']);
});

it('liga e desliga o serviço', async () => {
  const native = fakeNative(true);
  mockNative.current = native;
  await renderScreen();
  await screen.findByText('Ligado: não');

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Ligar o serviço' })));
  expect(native.startMonitoring).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Ligado: sim')).toBeOnTheScreen();
  expect(screen.getByText('Verificações: 4 (última: nunca)')).toBeOnTheScreen();

  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: 'Desligar o serviço' })),
  );
  expect(native.stopMonitoring).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Ligado: não')).toBeOnTheScreen();
});

it('sem o acesso ao uso, não liga o serviço e explica', async () => {
  const native = fakeNative(false);
  mockNative.current = native;
  await renderScreen();

  expect(await screen.findByText('Sem acesso ao uso.')).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Ligar o serviço' })));
  expect(screen.getByText('Conceda o acesso ao uso antes de ligar o serviço.')).toBeOnTheScreen();
  expect(screen.getByText('Ligado: não')).toBeOnTheScreen();
});

it('abre a tela certa dos Ajustes', async () => {
  const native = fakeNative(false);
  mockNative.current = native;
  await renderScreen();
  await screen.findByText('Sem acesso ao uso.');

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: 'Abrir acesso ao uso' }));
    fireEvent.press(screen.getByRole('button', { name: 'Abrir sobreposição' }));
    fireEvent.press(screen.getByRole('button', { name: 'Abrir notificações' }));
  });
  expect(native.openUsageAccessSettings).toHaveBeenCalledTimes(1);
  expect(native.openOverlaySettings).toHaveBeenCalledTimes(1);
  expect(native.openNotificationSettings).toHaveBeenCalledTimes(1);
});

it.each(['preview', 'production'] as const)('em %s, volta ao início', async (environment) => {
  mockVariant.environment = environment;
  mockNative.current = fakeNative(true);
  await renderScreen();
  expect(screen).toHavePathname('/');
  expect(mockNative.current.listTargets).not.toHaveBeenCalled();
});

it('mostra o que o nativo guardou da configuração e os eventos pendentes', async () => {
  config = JSON.stringify({
    compulsions: [{}, {}],
    moderationRules: [{}],
    riskAppRules: [{}, {}, {}],
  });
  const native = fakeNative(true);
  native.getServiceStatus.mockReturnValue({ ...STOPPED, pendingEvents: 2 });
  mockNative.current = native;
  await renderScreen();

  expect(
    await screen.findByText(
      'Configuração recebida: 2 compulsão(ões), 1 limite(s) de vídeos, 3 app(s) de risco',
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText('Eventos aguardando importação: 2')).toBeOnTheScreen();
});

it('sem configuração, avisa; "Sincronizar agora" roda a sincronização do app', async () => {
  mockNative.current = fakeNative(true);
  await renderScreen();
  expect(await screen.findByText('O nativo ainda não recebeu configuração.')).toBeOnTheScreen();

  await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Sincronizar agora' })));
  expect(mockSync).toHaveBeenCalledTimes(1);
});

it('mostra as regras de hoje e liga o limite de teste', async () => {
  moment = {
    rules: {
      dayKey: '2026-11-08',
      compulsions: { '3': { interruptions: 2, continues: 1, stopped: false } },
    },
    usage: { 'com.instagram.android': 3 * 60_000 },
    foreground: 'com.instagram.android',
    lastShow: {
      at: new Date(2026, 10, 8, 9, 5, 7).getTime(),
      compulsionId: 3,
      target: 'com.instagram.android',
    },
    testLimitMinutes: null,
  };
  const native = fakeNative(true);
  mockNative.current = native;
  await renderScreen();

  expect(
    await screen.findByText('Compulsão 3: 2 tela(s), 1 continuar, encerrada: não'),
  ).toBeOnTheScreen();
  expect(screen.getByText('App na frente: Instagram')).toBeOnTheScreen();
  expect(screen.getByText('Instagram: 3 min')).toBeOnTheScreen();
  expect(screen.getByText('Última tela pedida: Instagram, 08/11 09:05:07')).toBeOnTheScreen();

  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: 'Usar limite de 1 minuto' })),
  );
  expect(native.setTestLimit).toHaveBeenCalledWith(1);
  await act(async () =>
    fireEvent.press(screen.getByRole('button', { name: 'Voltar aos limites reais' })),
  );
  expect(native.setTestLimit).toHaveBeenLastCalledWith(null);
});
