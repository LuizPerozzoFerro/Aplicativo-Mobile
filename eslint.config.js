// ESLint em formato flat (SDK 53+), com a configuração do Expo e o Prettier.
// Guia: https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

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
  eslintPluginPrettierRecommended,
]);
