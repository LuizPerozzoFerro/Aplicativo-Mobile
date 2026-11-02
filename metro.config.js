// Configuração do Metro (padrão do Expo) com o prototype/ fora do bundler:
// ele tem o próprio package.json e node_modules, que não podem se misturar ao app.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

const prototypeDir = path.resolve(__dirname, 'prototype');
const escapeForRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${escapeForRegExp(prototypeDir)}[\\\\/].*`),
];

module.exports = config;
