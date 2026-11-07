// Config plugin: acrescenta `fontScale` e `density` ao `android:configChanges`
// da MainActivity a cada prebuild (spec 03, seção 5.12; NOTAS-APP.md, "Ponto
// para a Fase 4").
//
// Por quê: sem eles, o Android recria a Activity quando o usuário muda o
// tamanho da fonte ou da tela com o app aberto. O JavaScript continua o mesmo
// e monta a raiz de novo antes de a antiga sair, e o React Navigation reclama
// de dois containers. Com eles, a Activity fica, e o React Native recebe a
// mudança pelo `onConfigurationChanged`.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const EXTRA_CONFIG_CHANGES = ['fontScale', 'density'];

/**
 * Junta os valores novos aos que já existem, sem repetir e mantendo a ordem.
 * @param {string | undefined} current
 * @param {readonly string[]} extra
 * @returns {string}
 */
function mergeConfigChanges(current, extra) {
  const values = (current ?? '')
    .split('|')
    .map((value) => value.trim())
    .filter(Boolean);
  for (const value of extra) {
    if (!values.includes(value)) values.push(value);
  }
  return values.join('|');
}

function withFontScaleConfigChanges(config) {
  return withAndroidManifest(config, (modConfig) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(modConfig.modResults);
    activity.$['android:configChanges'] = mergeConfigChanges(
      activity.$['android:configChanges'],
      EXTRA_CONFIG_CHANGES,
    );
    return modConfig;
  });
}

module.exports = withFontScaleConfigChanges;
module.exports.mergeConfigChanges = mergeConfigChanges;
module.exports.EXTRA_CONFIG_CHANGES = EXTRA_CONFIG_CHANGES;
