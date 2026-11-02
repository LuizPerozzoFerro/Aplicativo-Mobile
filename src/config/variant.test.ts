import { ENVIRONMENTS, isEnvironment, resolveVariant, variant } from './variant';

describe('resolveVariant', () => {
  it.each(ENVIRONMENTS)('aceita o ambiente %s', (environment) => {
    expect(resolveVariant({ environment }).environment).toBe(environment);
  });

  it('mantém a detecção de domínios desligada em todos os ambientes (D6)', () => {
    for (const environment of ENVIRONMENTS) {
      expect(resolveVariant({ environment }).features.domainMonitoring).toBe(false);
    }
  });

  it.each([undefined, {}, { environment: 'staging' }, { environment: 1 }])(
    'lança erro com a config %p',
    (extra) => {
      expect(() => resolveVariant(extra as Record<string, unknown> | undefined)).toThrow(
        'Variante de build ausente ou inválida',
      );
    },
  );
});

describe('isEnvironment', () => {
  it('reconhece só os três ambientes', () => {
    expect(isEnvironment('production')).toBe(true);
    expect(isEnvironment('Production')).toBe(false);
    expect(isEnvironment(undefined)).toBe(false);
  });
});

describe('variant', () => {
  it('lê o ambiente do expo-constants (simulado no jest.setup.ts)', () => {
    expect(variant).toEqual({ environment: 'development', features: { domainMonitoring: false } });
  });
});
