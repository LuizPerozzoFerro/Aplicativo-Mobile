import type { ConfigContext, ExpoConfig } from 'expo/config';

import contentHosting from './scripts/content-hosting.json';

// Variante de ambiente (spec 01, seções 4.2 e 4.3), escolhida pela variável
// APP_ENV no momento do build ou do Metro. Sem APP_ENV, vale `development`.
// Este arquivo não importa nada de src/: a CLI do Expo o avalia fora do app.
const ENVIRONMENTS = {
  development: { packageSuffix: '.dev', name: 'Quedo Dev', scheme: 'quedo-dev' },
  preview: { packageSuffix: '.preview', name: 'Quedo Preview', scheme: 'quedo-preview' },
  production: { packageSuffix: '', name: 'Quedo', scheme: 'quedo' },
} as const;

export type Environment = keyof typeof ENVIRONMENTS;

// Não pode mudar depois do primeiro envio ao Google Play (CLAUDE.md, seção 5).
const BASE_IDENTIFIER = 'br.com.quedo.app';

const ICON_BACKGROUND = '#3F5A66';

// Projeto EAS do app (separado do protótipo), criado com `eas init` em 02/11/2026.
const EAS_OWNER = 'luizperozzoferro';
const EAS_PROJECT_ID = '6fda3fa1-8aea-4cf0-bdfa-5435b807d83a';

// Conteúdo remoto (spec 04, 4.1): endereço público do bucket do Cloudflare R2. O endereço
// de teste do R2 (r2.dev) tem limite de acessos e não serve para produção: desenvolvimento
// e prévia usam o r2.dev; a produção fica sem endereço (só o catálogo embutido) até o
// domínio próprio, antes da Fase 8. Não é segredo: é o endereço que o app consulta. Fica
// em scripts/content-hosting.json, o mesmo que o `npm run content:publish` usa.
const R2_DEV_CONTENT_URL = contentHosting.r2DevUrl;

const CONTENT_BASE_URLS: Readonly<Record<Environment, string | null>> = {
  development: R2_DEV_CONTENT_URL,
  preview: R2_DEV_CONTENT_URL,
  production: null,
};

function isR2DevUrl(value: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(value).hostname;
  } catch {
    throw new Error(`Endereço do conteúdo inválido: "${value}".`);
  }
  return hostname === 'r2.dev' || hostname.endsWith('.r2.dev');
}

/**
 * Endereço do conteúdo da variante. CONTENT_BASE_URL substitui o padrão (ex.: o
 * servidor falso de `npm run content:serve`). A produção nunca aponta para o r2.dev:
 * o build falha aqui (spec 04, 4.1 e P15). O formato é conferido de novo no app, em
 * src/config/variant.ts.
 */
export function resolveContentConfig(
  environment: Environment,
  override: string | undefined = process.env.CONTENT_BASE_URL,
): string | null {
  const value = override || CONTENT_BASE_URLS[environment];
  if (environment === 'production' && value !== null && isR2DevUrl(value)) {
    throw new Error(
      'A produção não pode usar o endereço de teste do R2 (r2.dev) para o conteúdo. ' +
        'Use o domínio próprio em CONTENT_BASE_URL ou no app.config.ts.',
    );
  }
  return value;
}

function readEnvironment(): Environment {
  const value = process.env.APP_ENV || 'development';
  if (!(value in ENVIRONMENTS)) {
    throw new Error(`APP_ENV inválido: "${value}". Use ${Object.keys(ENVIRONMENTS).join(', ')}.`);
  }
  return value as Environment;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = readEnvironment();
  const { packageSuffix, name, scheme } = ENVIRONMENTS[environment];
  const identifier = `${BASE_IDENTIFIER}${packageSuffix}`;

  return {
    ...config,
    name,
    slug: 'quedo',
    owner: EAS_OWNER,
    version: '1.0.0',
    scheme,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    android: {
      package: identifier,
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: ICON_BACKGROUND,
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      // Dados sensíveis não vão para o backup do Google (spec 01, seção 4.6).
      allowBackup: false,
      blockedPermissions: [
        // O template do Expo declara acesso ao armazenamento externo, que o app não usa.
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        // Origem da instalação: vem com o expo-application, e o app não a usa.
        // Também proibida no scripts/check-manifest.js.
        'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
      ],
      predictiveBackGestureEnabled: false,
    },
    ios: {
      // Reservado para a Fase 10; nada é testado no iOS agora.
      bundleIdentifier: identifier,
      supportsTablet: false,
    },
    plugins: [
      'expo-router',
      'expo-system-ui',
      './plugins/with-local-cmake',
      './plugins/with-font-scale-config-changes',
      // Player dos vídeos dos marcos (spec 04, 5.6): sem reprodução em segundo plano
      // (que acrescentaria um serviço e as permissões FOREGROUND_SERVICE*) e sem
      // imagem sobre imagem. Desligados de propósito, não só por omissão.
      ['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      environment,
      // Conteúdo remoto (spec 04, 4.1): ver resolveContentConfig acima. Sem endereço, a
      // chave fica de fora: a serialização do Expo (serializeAndEvaluate, no @expo/config)
      // transforma `null` em `{}`, que o app recusaria como endereço inválido.
      contentBaseUrl: resolveContentConfig(environment) ?? undefined,
      eas: { projectId: EAS_PROJECT_ID },
    },
  };
};
