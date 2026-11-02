// ESLint em formato flat (SDK 53+), com a configuração do Expo e o Prettier.
// Guia: https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const i18next = require('eslint-plugin-i18next');

// Textos visíveis fora do JSX, que a regra do i18next não enxerga: opções de
// navegação (title, tabBarLabel…), botões de Alert ({ text }) e conteúdo de
// notificação (title, body). Um texto literal nessas propriedades é erro.
const TEXT_PROPERTIES = [
  'title',
  'headerTitle',
  'headerBackTitle',
  'tabBarLabel',
  'tabBarAccessibilityLabel',
  'drawerLabel',
  'accessibilityLabel',
  'accessibilityHint',
  'placeholder',
  'label',
  'text',
  'message',
  'description',
  'subtitle',
  'body',
].join('|');
// Só textos: strings que não são cor hexadecimal (o token de cor `text: '#…'`
// tem o mesmo nome de propriedade, mas não é texto visível).
const STRING_LITERAL = '[raw=/^[\'"](?!#[0-9A-Fa-f]{3,8}[\'"])/]';
const I18N_MESSAGE = 'Texto visível precisa vir do t() (src/i18n/pt-BR/), não de literal.';

module.exports = defineConfig([
  // prototype/ é só referência (spec 01, seção 4.1); o resto é gerado.
  globalIgnores([
    'prototype/**',
    'android/**',
    'ios/**',
    '.expo/**',
    'dist/**',
    'coverage/**',
    'expo-env.d.ts',
    // Gerado pelo drizzle-kit (npm run db:generate).
    'drizzle/**',
  ]),
  expoConfig,
  {
    // i18n obrigatório (CLAUDE.md 8.3, spec 01 seção 4.5): nenhum texto visível
    // fixo em JSX. Todo texto vem de src/i18n/pt-BR/ pelo t().
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          // jsx-only: texto em JSX, literais em {…} e os atributos abaixo.
          mode: 'jsx-only',
          'should-validate-template': true,
          // Só atributos que o usuário vê ou que o leitor de tela fala; os
          // técnicos (testID, variant, href…) ficam livres.
          'jsx-attributes': {
            include: [
              '^accessibilityLabel$',
              '^accessibilityHint$',
              '^aria-label$',
              '^placeholder$',
              '^title$',
              '^label$',
              '^alt$',
            ],
          },
        },
      ],
      'no-restricted-syntax': [
        'error',
        ...['Literal' + STRING_LITERAL, 'TemplateLiteral'].map((valueSelector) => ({
          selector: `Property[key.name=/^(${TEXT_PROPERTIES})$/] > ${valueSelector}.value`,
          message: I18N_MESSAGE,
        })),
        ...['Literal' + STRING_LITERAL, 'TemplateLiteral'].map((argSelector) => ({
          selector: `CallExpression:matches([callee.object.name='Alert'][callee.property.name=/^(alert|prompt)$/], [callee.object.name='ToastAndroid'][callee.property.name=/^show/]) > ${argSelector}.arguments`,
          message: I18N_MESSAGE,
        })),
      ],
    },
  },
  eslintPluginPrettierRecommended,
]);
