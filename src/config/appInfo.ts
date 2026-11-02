import * as Application from 'expo-application';

import { variant, type Environment } from './variant';

export type AppInfo = {
  /** Nome do app na tela inicial (ex.: "Quedo Dev"). */
  readonly name: string | null;
  /** Versão do app instalado (`version` do app.config.ts). */
  readonly version: string | null;
  /**
   * Número do build do app instalado (versionCode no Android). Vem do pacote
   * instalado, não do app.config.ts: nos builds de loja o EAS o incrementa
   * sozinho (appVersionSource remote).
   */
  readonly build: string | null;
  readonly environment: Environment;
};

/** Informações do app para a tela "Sobre" (spec 01, seção 4.12). */
export function getAppInfo(): AppInfo {
  return {
    name: Application.applicationName,
    version: Application.nativeApplicationVersion,
    build: Application.nativeBuildVersion,
    environment: variant.environment,
  };
}
