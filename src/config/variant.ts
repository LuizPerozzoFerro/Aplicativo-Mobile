import Constants from 'expo-constants';

// Ponto único de leitura da variante de build (spec 01, seção 4.3). Quem
// precisar saber o ambiente ou uma flag consulta este módulo, nunca o
// app.config.ts nem process.env.

export const ENVIRONMENTS = ['development', 'preview', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export type Features = {
  /** Detecção de domínios pela VPN local. Sempre desligada na primeira versão (D6). */
  readonly domainMonitoring: false;
};

export type Variant = {
  readonly environment: Environment;
  readonly features: Features;
  /**
   * Endereço base do conteúdo remoto (spec 04, 4.1), sem a barra final. Nulo:
   * o app usa só o catálogo embutido e o que já tiver guardado.
   */
  readonly contentBaseUrl: string | null;
};

export function isEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
}

/** Servidor falso no computador, pelo `adb reverse`: só no desenvolvimento. */
const LOCAL_URL_PATTERN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/\S*)?$/;
const HTTPS_URL_PATTERN = /^https:\/\/[^\s/?#]+(?:\/\S*)?$/;

/** Endereço de teste do R2: tem limite de acessos e não serve para produção. */
const R2_DEV_HOST_PATTERN = /^https:\/\/(?:[^\s/?#@]+\.)?r2\.dev(?::\d+)?(?:[/?#]|$)/i;

/**
 * Endereço do conteúdo: https em qualquer ambiente; http só para o servidor
 * falso local, no desenvolvimento; nunca o r2.dev na produção (o build já
 * recusa, no app.config.ts; aqui é a segunda barreira). Lança erro com um
 * endereço inválido, para o problema aparecer no primeiro teste do build, e
 * não em silêncio.
 */
export function resolveContentBaseUrl(value: unknown, environment: Environment): string | null {
  if (value === undefined || value === null || value === '') return null;
  const valid =
    typeof value === 'string' &&
    (HTTPS_URL_PATTERN.test(value) ||
      (environment === 'development' && LOCAL_URL_PATTERN.test(value))) &&
    !(environment === 'production' && R2_DEV_HOST_PATTERN.test(value));
  if (!valid) throw new Error('Endereço do conteúdo inválido em expoConfig.extra.contentBaseUrl');
  return value.replace(/\/+$/, '');
}

export function resolveVariant(extra: Record<string, unknown> | undefined): Variant {
  const environment = extra?.environment;
  if (!isEnvironment(environment)) {
    throw new Error('Variante de build ausente ou inválida em expoConfig.extra.environment');
  }
  return {
    environment,
    features: { domainMonitoring: false },
    contentBaseUrl: resolveContentBaseUrl(extra?.contentBaseUrl, environment),
  };
}

export const variant: Variant = resolveVariant(Constants.expoConfig?.extra);
