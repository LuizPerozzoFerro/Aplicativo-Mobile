// Config plugin: aponta o build nativo para um CMake mais novo do SDK local,
// gravando `cmake.dir` em android/local.properties a cada prebuild.
//
// Por quê: o CMake padrão (3.22.1) traz o ninja 1.10.2, que não lida com
// caminhos acima de 260 caracteres no Windows, e o C++ do react-native-worklets
// passa disso (NOTAS-APP.md, AP1). O CMake 3.31.6 traz o ninja 1.12.1.
//
// Só age se essa versão estiver instalada no SDK da máquina; em outros
// ambientes (EAS, Linux) o build segue com o CMake padrão.
const fs = require('node:fs');
const path = require('node:path');
const { withDangerousMod } = require('expo/config-plugins');

const CMAKE_VERSION = '3.31.6';

function findCmakeDir() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) return null;
  const dir = path.join(sdk, 'cmake', CMAKE_VERSION);
  return fs.existsSync(path.join(dir, 'bin')) ? dir : null;
}

module.exports = function withLocalCmake(config) {
  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const cmakeDir = findCmakeDir();
      if (!cmakeDir) return modConfig;

      const file = path.join(modConfig.modRequest.platformProjectRoot, 'local.properties');
      const lines = fs.existsSync(file)
        ? fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => !line.startsWith('cmake.dir='))
        : [];
      // Barras normais: o formato .properties trata a contrabarra como escape.
      lines.push(`cmake.dir=${cmakeDir.replace(/\\/g, '/')}`);
      fs.writeFileSync(file, `${lines.filter(Boolean).join('\n')}\n`);
      return modConfig;
    },
  ]);
};
