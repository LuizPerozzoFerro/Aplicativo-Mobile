import type { ConfigContext } from 'expo/config';

import buildConfig, { resolveContentConfig } from '../../app.config';

// A verificação do build (spec 04, 4.1 e P15): o app.config.ts é avaliado no
// prebuild, no Metro e no EAS; um erro aqui impede o build.

const R2_DEV = 'https://pub-0123456789abcdef.r2.dev';

describe('resolveContentConfig', () => {
  it('desenvolvimento e prévia usam o endereço de teste do R2', () => {
    for (const environment of ['development', 'preview'] as const) {
      expect(resolveContentConfig(environment, undefined)).toMatch(/^https:\/\/pub-\w+\.r2\.dev$/);
    }
  });

  it('a produção fica sem endereço até o domínio próprio', () => {
    expect(resolveContentConfig('production', undefined)).toBeNull();
  });

  it('CONTENT_BASE_URL substitui o padrão (servidor falso)', () => {
    expect(resolveContentConfig('development', 'http://localhost:8090')).toBe(
      'http://localhost:8090',
    );
    expect(resolveContentConfig('production', 'https://conteudo.example.com')).toBe(
      'https://conteudo.example.com',
    );
  });

  it.each([R2_DEV, `${R2_DEV}/`, 'https://R2.DEV/', 'https://x.r2.dev:443/pasta'])(
    'a produção apontando para o r2.dev (%s) derruba o build',
    (value) => {
      expect(() => resolveContentConfig('production', value)).toThrow(
        'A produção não pode usar o endereço de teste do R2',
      );
    },
  );

  it('na produção, endereço que não se lê como URL também derruba o build', () => {
    expect(() => resolveContentConfig('production', 'pub-x.r2.dev')).toThrow(
      'Endereço do conteúdo inválido',
    );
  });

  it('domínio que só contém "r2.dev" no meio passa', () => {
    expect(resolveContentConfig('production', 'https://r2.dev.example.com')).toBe(
      'https://r2.dev.example.com',
    );
  });
});

describe('app.config.ts', () => {
  const saved = { APP_ENV: process.env.APP_ENV, CONTENT_BASE_URL: process.env.CONTENT_BASE_URL };
  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const context = { config: {} } as ConfigContext;

  it('build de produção com CONTENT_BASE_URL no r2.dev é recusado', () => {
    process.env.APP_ENV = 'production';
    process.env.CONTENT_BASE_URL = R2_DEV;
    expect(() => buildConfig(context)).toThrow('A produção não pode usar o endereço de teste');
  });

  it('sem endereço, a chave fica indefinida, nunca null (o Expo serializaria como {})', () => {
    process.env.APP_ENV = 'production';
    delete process.env.CONTENT_BASE_URL;
    expect(buildConfig(context).extra?.contentBaseUrl).toBeUndefined();
  });

  it('build de prévia leva o r2.dev no extra', () => {
    process.env.APP_ENV = 'preview';
    delete process.env.CONTENT_BASE_URL;
    expect(buildConfig(context).extra?.contentBaseUrl).toMatch(/\.r2\.dev$/);
  });
});

describe('permissões bloqueadas (spec 04, 5.6: o vídeo não traz permissão nova)', () => {
  const saved = process.env.APP_ENV;
  afterEach(() => {
    if (saved === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = saved;
  });
  const blocked = (environment: string) => {
    process.env.APP_ENV = environment;
    return buildConfig({ config: {} } as ConfigContext).android?.blockedPermissions ?? [];
  };

  it('a de manter o processo acordado, do ExoPlayer, fica fora em todas as variantes', () => {
    for (const environment of ['development', 'preview', 'production']) {
      expect(blocked(environment)).toContain('android.permission.WAKE_LOCK');
    }
  });

  it('a do tipo de conexão, também do ExoPlayer, fica em todas as variantes (decisão de 23/11)', () => {
    for (const environment of ['development', 'preview', 'production']) {
      expect(blocked(environment)).not.toContain('android.permission.ACCESS_NETWORK_STATE');
    }
  });
});
