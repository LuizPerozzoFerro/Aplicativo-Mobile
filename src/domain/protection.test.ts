import {
  PROTECTION_NOTICE_SNOOZE_MS,
  SERVICE_START_GRACE_MS,
  getNewlyGrantedPermissions,
  getProtectionIssues,
  getProtectionNeeds,
  getProtectionNotice,
  getServiceSituation,
  type PermissionHistory,
  type ProtectionNeeds,
  type ProtectionPermissions,
  type ProtectionService,
} from './protection';

const NOW = 1_000_000;
const ALL: ProtectionNeeds = { notifications: true, usageAccess: true, overlay: true };
const NONE: ProtectionNeeds = { notifications: false, usageAccess: false, overlay: false };
const GRANTED: ProtectionPermissions = {
  usageAccess: 'granted',
  notifications: 'granted',
  overlay: 'granted',
};
const RUNNING: ProtectionService = { active: true, running: true, startRequestedAt: null };
const STOPPED: ProtectionService = { active: true, running: false, startRequestedAt: null };

const NEVER: PermissionHistory = { usageAccess: false, notifications: false, overlay: false };

describe('getNewlyGrantedPermissions', () => {
  it('lista o que está concedido e ainda não foi registrado', () => {
    expect(getNewlyGrantedPermissions(GRANTED, NEVER)).toEqual([
      'usageAccess',
      'notifications',
      'overlay',
    ]);
  });

  it('o que já está no histórico não entra de novo', () => {
    expect(getNewlyGrantedPermissions(GRANTED, { ...NEVER, overlay: true })).toEqual([
      'usageAccess',
      'notifications',
    ]);
  });

  it('negada ou sem suporte não entra', () => {
    expect(
      getNewlyGrantedPermissions(
        { usageAccess: 'denied', notifications: 'unsupported', overlay: 'granted' },
        NEVER,
      ),
    ).toEqual(['overlay']);
  });
});

describe('getProtectionNotice', () => {
  it('sem nada faltando, não há aviso', () => {
    expect(getProtectionNotice([], NEVER, null, NOW)).toBeNull();
  });

  it('nunca concedida: convida a ativar', () => {
    expect(getProtectionNotice(['usageAccess'], NEVER, null, NOW)).toEqual({
      kind: 'activate',
      issues: ['usageAccess'],
    });
  });

  it('já esteve concedida: proteção pausada', () => {
    expect(
      getProtectionNotice(['usageAccess'], { ...NEVER, usageAccess: true }, null, NOW)?.kind,
    ).toBe('paused');
  });

  it('o histórico de outra permissão não conta', () => {
    expect(getProtectionNotice(['usageAccess'], { ...NEVER, overlay: true }, null, NOW)?.kind).toBe(
      'activate',
    );
  });

  it('serviço parado: proteção pausada', () => {
    expect(getProtectionNotice(['service'], NEVER, null, NOW)?.kind).toBe('paused');
  });

  it('uma perdida junto de uma nunca concedida: pausada, com as duas linhas', () => {
    expect(
      getProtectionNotice(
        ['notifications', 'usageAccess'],
        { ...NEVER, usageAccess: true },
        null,
        NOW,
      ),
    ).toEqual({ kind: 'paused', issues: ['notifications', 'usageAccess'] });
  });

  it('adiado: esconde até o último instante dos 7 dias', () => {
    const dismissedAt = NOW - PROTECTION_NOTICE_SNOOZE_MS + 1;
    expect(getProtectionNotice(['usageAccess'], NEVER, dismissedAt, NOW)).toBeNull();
  });

  it('passados os 7 dias, volta a aparecer', () => {
    const dismissedAt = NOW - PROTECTION_NOTICE_SNOOZE_MS;
    expect(getProtectionNotice(['usageAccess'], NEVER, dismissedAt, NOW)?.kind).toBe('activate');
  });

  it('o adiamento vale 7 dias', () => {
    expect(PROTECTION_NOTICE_SNOOZE_MS).toBe(604_800_000);
  });

  it('adiar não esconde o que parou de funcionar', () => {
    expect(
      getProtectionNotice(['usageAccess'], { ...NEVER, usageAccess: true }, NOW, NOW)?.kind,
    ).toBe('paused');
    expect(getProtectionNotice(['service'], NEVER, NOW, NOW)?.kind).toBe('paused');
  });

  it('relógio voltado para antes do adiamento: mostra o aviso', () => {
    expect(getProtectionNotice(['usageAccess'], NEVER, NOW + 1, NOW)?.kind).toBe('activate');
  });
});

describe('getProtectionNeeds', () => {
  const compulsions = [{}];

  it('sem compulsão, nada faz falta', () => {
    expect(getProtectionNeeds({ compulsions: [], moderationRules: [], riskAppRules: [] })).toEqual(
      NONE,
    );
  });

  it('só check-in e lembretes: notificações, sem serviço', () => {
    expect(getProtectionNeeds({ compulsions, moderationRules: [], riskAppRules: [] })).toEqual({
      notifications: true,
      usageAccess: false,
      overlay: false,
    });
  });

  it('moderação pede tudo', () => {
    expect(getProtectionNeeds({ compulsions, moderationRules: [{}], riskAppRules: [] })).toEqual(
      ALL,
    );
  });

  it('app de risco não declarado mede o uso, mas nunca tem tela', () => {
    expect(
      getProtectionNeeds({
        compulsions,
        moderationRules: [],
        riskAppRules: [{ interruption: false }],
      }),
    ).toEqual({ notifications: true, usageAccess: true, overlay: false });
  });

  it('app de risco declarado tem tela', () => {
    expect(
      getProtectionNeeds({
        compulsions,
        moderationRules: [],
        riskAppRules: [{ interruption: false }, { interruption: true }],
      }).overlay,
    ).toBe(true);
  });
});

describe('getServiceSituation', () => {
  it('sem regra de uso, parado é o normal', () => {
    expect(getServiceSituation(NONE, GRANTED, STOPPED, NOW)).toBe('idle');
  });

  it('sem o acesso ao uso, o que falta é a permissão', () => {
    expect(getServiceSituation(ALL, { ...GRANTED, usageAccess: 'denied' }, STOPPED, NOW)).toBe(
      'needs_usage_access',
    );
  });

  it('ligado e rodando', () => {
    expect(getServiceSituation(ALL, GRANTED, RUNNING, NOW)).toBe('running');
  });

  it('ligado e sem rodar: parou', () => {
    expect(getServiceSituation(ALL, GRANTED, STOPPED, NOW)).toBe('stopped');
  });

  it('nunca ligado também conta como parado', () => {
    expect(getServiceSituation(ALL, GRANTED, { ...STOPPED, active: false }, NOW)).toBe('stopped');
  });

  it('logo depois de pedir, ainda não acusa', () => {
    const service = { ...STOPPED, startRequestedAt: NOW - SERVICE_START_GRACE_MS + 1 };
    expect(getServiceSituation(ALL, GRANTED, service, NOW)).toBe('running');
  });

  it('passada a carência, acusa', () => {
    const service = { ...STOPPED, startRequestedAt: NOW - SERVICE_START_GRACE_MS };
    expect(getServiceSituation(ALL, GRANTED, service, NOW)).toBe('stopped');
  });
});

describe('getProtectionIssues', () => {
  it('tudo certo: nenhum aviso', () => {
    expect(getProtectionIssues(ALL, GRANTED, RUNNING, NOW)).toEqual([]);
  });

  it('lista cada permissão negada que faz falta', () => {
    const denied: ProtectionPermissions = {
      usageAccess: 'denied',
      notifications: 'denied',
      overlay: 'denied',
    };
    expect(getProtectionIssues(ALL, denied, STOPPED, NOW)).toEqual([
      'notifications',
      'usageAccess',
      'overlay',
    ]);
  });

  it('o que não faz falta não vira aviso', () => {
    const denied: ProtectionPermissions = {
      usageAccess: 'denied',
      notifications: 'denied',
      overlay: 'denied',
    };
    expect(getProtectionIssues(NONE, denied, STOPPED, NOW)).toEqual([]);
  });

  it('sobreposição sem tela prevista não faz falta', () => {
    expect(
      getProtectionIssues(
        { ...ALL, overlay: false },
        { ...GRANTED, overlay: 'denied' },
        RUNNING,
        NOW,
      ),
    ).toEqual([]);
  });

  it('sem suporte na plataforma não é falta', () => {
    expect(getProtectionIssues(ALL, { ...GRANTED, overlay: 'unsupported' }, RUNNING, NOW)).toEqual(
      [],
    );
  });

  it('serviço parado com a permissão dada', () => {
    expect(getProtectionIssues(ALL, GRANTED, STOPPED, NOW)).toEqual(['service']);
  });
});
