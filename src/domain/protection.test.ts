import {
  SERVICE_START_GRACE_MS,
  getProtectionIssues,
  getProtectionNeeds,
  getServiceSituation,
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
