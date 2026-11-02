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
};

export function isEnvironment(value: unknown): value is Environment {
  return typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
}

export function resolveVariant(extra: Record<string, unknown> | undefined): Variant {
  const environment = extra?.environment;
  if (!isEnvironment(environment)) {
    throw new Error('Variante de build ausente ou inválida em expoConfig.extra.environment');
  }
  return {
    environment,
    features: { domainMonitoring: false },
  };
}

export const variant: Variant = resolveVariant(Constants.expoConfig?.extra);
