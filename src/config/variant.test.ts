import {
  ENVIRONMENTS,
  isEnvironment,
  resolveContentBaseUrl,
  resolveVariant,
  variant,
} from './variant';

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
    expect(variant).toEqual({
      environment: 'development',
      features: { domainMonitoring: false },
      contentBaseUrl: null,
    });
  });
});

describe('resolveContentBaseUrl', () => {
  it.each([undefined, null, ''])('sem endereço (%p), fica nulo', (value) => {
    for (const environment of ENVIRONMENTS) {
      expect(resolveContentBaseUrl(value, environment)).toBeNull();
    }
  });

  it('aceita https em qualquer ambiente e tira a barra final', () => {
    for (const environment of ENVIRONMENTS) {
      expect(resolveContentBaseUrl('https://conteudo.example.com/', environment)).toBe(
        'https://conteudo.example.com',
      );
    }
  });

  it('aceita o servidor falso local (http) só no desenvolvimento', () => {
    expect(resolveContentBaseUrl('http://localhost:8090', 'development')).toBe(
      'http://localhost:8090',
    );
    expect(resolveContentBaseUrl('http://127.0.0.1:8090/', 'development')).toBe(
      'http://127.0.0.1:8090',
    );
    expect(() => resolveContentBaseUrl('http://localhost:8090', 'preview')).toThrow();
    expect(() => resolveContentBaseUrl('http://localhost:8090', 'production')).toThrow();
  });

  it.each(['http://conteudo.example.com', 'ftp://example.com', 'example.com', 'https://', 3])(
    'recusa %p',
    (value) => {
      expect(() => resolveContentBaseUrl(value, 'development')).toThrow(
        'Endereço do conteúdo inválido',
      );
    },
  );

  it('resolveVariant lê o endereço do extra', () => {
    expect(
      resolveVariant({ environment: 'preview', contentBaseUrl: 'https://conteudo.example.com' })
        .contentBaseUrl,
    ).toBe('https://conteudo.example.com');
  });
});
