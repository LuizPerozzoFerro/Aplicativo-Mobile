import type { ConfigContext, ExpoConfig } from 'expo/config';

// Variante de ambiente (spec 01, seções 4.2 e 4.3), escolhida pela variável
// APP_ENV no momento do build ou do Metro. Sem APP_ENV, vale `development`.
// Este arquivo não importa nada de src/: a CLI do Expo o avalia fora do app.
const ENVIRONMENTS = {
  development: { packageSuffix: '.dev', name: 'Quedo Dev', scheme: 'quedo-dev' },
  preview: { packageSuffix: '.preview', name: 'Quedo Preview', scheme: 'quedo-preview' },
  production: { packageSuffix: '', name: 'Quedo', scheme: 'quedo' },
} as const;

type Environment = keyof typeof ENVIRONMENTS;

// Não pode mudar depois do primeiro envio ao Google Play (CLAUDE.md, seção 5).
const BASE_IDENTIFIER = 'br.com.quedo.app';

const ICON_BACKGROUND = '#3F5A66';

// Projeto EAS do app (separado do protótipo), criado com `eas init` em 02/11/2026.
const EAS_OWNER = 'luizperozzoferro';
const EAS_PROJECT_ID = '6fda3fa1-8aea-4cf0-bdfa-5435b807d83a';

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
    plugins: ['expo-router', 'expo-system-ui', './plugins/with-local-cmake'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      environment,
      eas: { projectId: EAS_PROJECT_ID },
    },
  };
};
