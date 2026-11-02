// ESLint em formato flat (SDK 53+), com a configuração do Expo e o Prettier.
// Guia: https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const i18next = require('eslint-plugin-i18next');

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
    },
  },
  eslintPluginPrettierRecommended,
]);
