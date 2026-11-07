import { getPreselectedPackages, isSuggestedPackage } from '@/domain/suggestedApps';

import { FAKE_TARGETS, FakeMonitoringModule } from './FakeMonitoringModule';
import { getMonitoring } from './index';
import { MonitoringError, UNSUPPORTED, asTargetId, type UsageRule } from './types';

// Fuso de São Paulo (jest.global-setup.js). 15/03/2026, 23:50 local.
const LATE_NIGHT = new Date('2026-03-16T02:50:00.000Z');
const NEXT_MORNING = new Date('2026-03-16T12:00:00.000Z');

const clips = asTargetId('com.example.clips');
const feed = asTargetId('com.example.feed');

const rule = (overrides: Partial<UsageRule> = {}): UsageRule => ({
  id: 'videos',
  targetIds: [clips, feed],
  dailyLimitMinutes: 30,
  interruption: true,
  ...overrides,
});

function createAndroid(now: () => Date = () => LATE_NIGHT) {
  return new FakeMonitoringModule({ permissions: { usageAccess: 'granted' }, now });
}

describe('permissões', () => {
  it('começam negadas no Android e o pedido concede', async () => {
    const monitoring = new FakeMonitoringModule();
    expect(await monitoring.getPermissionStatus()).toEqual({
      usageAccess: 'denied',
      notifications: 'denied',
      overlay: 'denied',
    });
    expect(await monitoring.requestPermission('overlay')).toBe('granted');
    expect((await monitoring.getPermissionStatus()).overlay).toBe('granted');
  });

  it('o usuário pode recusar', async () => {
    const monitoring = new FakeMonitoringModule({ grantOnRequest: false });
    expect(await monitoring.requestPermission('notifications')).toBe('denied');
  });

  it('no iOS a sobreposição responde UNSUPPORTED, inclusive ao pedir', async () => {
    const monitoring = new FakeMonitoringModule({
      platform: 'ios',
      permissions: { overlay: 'granted' },
    });
    expect((await monitoring.getPermissionStatus()).overlay).toBe(UNSUPPORTED);
    expect(await monitoring.requestPermission('overlay')).toBe(UNSUPPORTED);
  });

  it('perder uma permissão concedida grava permission_lost (I-30)', async () => {
    const monitoring = createAndroid();
    monitoring.simulatePermission('usageAccess', 'denied');
    monitoring.simulatePermission('notifications', 'denied'); // já estava negada
    expect((await monitoring.getPendingEvents()).events).toEqual([
      {
        id: 'fake-1',
        at: LATE_NIGHT.getTime(),
        dayKey: '2026-03-15',
        type: 'permission_lost',
        permission: 'usageAccess',
      },
    ]);
  });

  it('getPermissionStatus devolve uma cópia', async () => {
    const monitoring = new FakeMonitoringModule();
    const status = (await monitoring.getPermissionStatus()) as { usageAccess: string };
    status.usageAccess = 'granted';
    expect((await monitoring.getPermissionStatus()).usageAccess).toBe('denied');
  });
});

describe('seleção de alvos (opaca)', () => {
  it('Android lista os apps com nome; o seletor da Apple não existe', async () => {
    const monitoring = new FakeMonitoringModule();
    expect(await monitoring.listTargets()).toEqual(FAKE_TARGETS);
    expect(await monitoring.pickTargets()).toBe(UNSUPPORTED);
  });

  it('iOS usa o seletor, sem nome do app; não há lista', async () => {
    const monitoring = new FakeMonitoringModule({ platform: 'ios' });
    expect(await monitoring.listTargets()).toBe(UNSUPPORTED);
    const picked = await monitoring.pickTargets();
    expect(picked).toEqual(FAKE_TARGETS.map((target) => ({ id: target.id, label: null })));
  });

  it('a lista tem os apps sugeridos, para testar a pré-marcação, e outros não sugeridos', () => {
    const ids = FAKE_TARGETS.map((target) => target.id as string);
    const suggested = ids.filter(
      (id) => isSuggestedPackage('short_video', id) || isSuggestedPackage('risk', id),
    );
    expect(getPreselectedPackages('short_video', ids)).toHaveLength(4);
    expect(getPreselectedPackages('risk', ids)).toEqual([
      'com.twitter.android',
      'com.reddit.frontpage',
    ]);
    // Os não sugeridos são de exemplo, com pacotes inofensivos.
    for (const id of ids.filter((item) => !suggested.includes(item))) {
      expect(id).toMatch(/^com\.example\./);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('limite de uso', () => {
  it('liga, informa as regras e desliga', async () => {
    const monitoring = createAndroid();
    await monitoring.startUsageLimit({ rules: [rule()] });
    expect(await monitoring.getUsageLimitStatus()).toEqual({ active: true, rules: [rule()] });
    await monitoring.stopUsageLimit();
    expect(await monitoring.getUsageLimitStatus()).toEqual({ active: false });
  });

  it('sem acesso ao uso, recusa com erro explícito', async () => {
    const monitoring = new FakeMonitoringModule();
    await expect(monitoring.startUsageLimit({ rules: [rule()] })).rejects.toMatchObject({
      code: 'permission_required',
    });
    await expect(monitoring.getUsageToday()).rejects.toBeInstanceOf(MonitoringError);
  });

  it.each([
    ['limite zero', [rule({ dailyLimitMinutes: 0 })]],
    ['limite fracionado', [rule({ dailyLimitMinutes: 1.5 })]],
    ['regra sem apps', [rule({ targetIds: [] })]],
    ['regra repetida', [rule(), rule()]],
  ])('recusa configuração inválida: %s', async (_name, rules) => {
    await expect(createAndroid().startUsageLimit({ rules })).rejects.toMatchObject({
      code: 'invalid_config',
    });
  });
});

describe('configuração e eventos (spec 03, 4.2 e 4.3)', () => {
  const config = {
    version: 1 as const,
    compulsions: [],
    moderationRules: [],
    riskAppRules: [],
    checkInMinutes: null,
    preventive: { weekdays: [], startMinutes: [], emotions: [] },
    motivation: null,
    texts: {
      channels: { tracking: 'a', alerts: 'b', reminders: 'c' },
      ongoing: { title: 'd', text: 'e' },
    },
  };

  it('guarda a última configuração e recusa versão desconhecida', async () => {
    const monitoring = createAndroid();
    await monitoring.configure(config);
    expect(monitoring.getLastConfig()).toBe(config);
    await expect(
      monitoring.configure({ ...config, version: 2 } as unknown as typeof config),
    ).rejects.toMatchObject({ code: 'invalid_config' });
    expect(monitoring.getLastConfig()).toBe(config);
  });

  it('eventos com id único, instante e dia; confirmar apaga só os confirmados', async () => {
    const monitoring = createAndroid();
    const first = monitoring.simulateEvent({ type: 'service_started', origin: 'app' });
    const second = monitoring.simulateEvent({
      type: 'day_failed',
      compulsionId: 2,
      reason: 'third_continue',
    });
    expect(first).toMatchObject({ id: 'fake-1', at: LATE_NIGHT.getTime(), dayKey: '2026-03-15' });
    expect(second.id).toBe('fake-2');
    expect(await monitoring.getPendingEvents()).toEqual({
      events: [first, second],
      invalidIds: [],
    });

    await monitoring.acknowledgeEvents([first.id, 'desconhecido']);
    expect((await monitoring.getPendingEvents()).events).toEqual([second]);
  });

  it('reset apaga configuração, regras e eventos', async () => {
    const monitoring = createAndroid();
    await monitoring.configure(config);
    await monitoring.startUsageLimit({ rules: [rule()] });
    monitoring.simulateEvent({ type: 'service_started', origin: 'boot' });
    await monitoring.reset();
    expect(monitoring.getLastConfig()).toBeNull();
    expect(await monitoring.getUsageLimitStatus()).toEqual({ active: false });
    expect((await monitoring.getPendingEvents()).events).toEqual([]);
  });
});

describe('uso de hoje', () => {
  it('soma por app e zera na virada da meia-noite', async () => {
    let now = LATE_NIGHT;
    const monitoring = createAndroid(() => now);
    await monitoring.startUsageLimit({ rules: [rule({ dailyLimitMinutes: 25 })] });
    monitoring.simulateUsage(clips, 15);
    monitoring.simulateUsage(clips, 5);
    monitoring.simulateUsage(feed, 2);
    expect(await monitoring.getUsageToday()).toEqual([
      { targetId: clips, milliseconds: 20 * 60_000 },
      { targetId: feed, milliseconds: 2 * 60_000 },
    ]);

    now = NEXT_MORNING;
    expect(await monitoring.getUsageToday()).toEqual([]);
  });

  it('no iOS responde UNSUPPORTED', async () => {
    const monitoring = new FakeMonitoringModule({
      platform: 'ios',
      permissions: { usageAccess: 'granted' },
    });
    expect(await monitoring.getUsageToday()).toBe(UNSUPPORTED);
  });
});

it('detecção de domínios responde UNSUPPORTED (D6)', async () => {
  const monitoring = createAndroid();
  expect(await monitoring.startDomainWatch()).toBe(UNSUPPORTED);
  expect(await monitoring.stopDomainWatch()).toBe(UNSUPPORTED);
});

describe('getMonitoring', () => {
  it('nesta fase devolve o falso, sempre a mesma instância', () => {
    const monitoring = getMonitoring();
    expect(monitoring).toBeInstanceOf(FakeMonitoringModule);
    expect(getMonitoring()).toBe(monitoring);
    expect(monitoring.platform).toBe('android');
  });
});
