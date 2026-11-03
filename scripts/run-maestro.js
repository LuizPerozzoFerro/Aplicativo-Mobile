// Roda os fluxos Maestro de .maestro/ (spec 01, seção 4.10), sempre com o
// analytics do Maestro desligado (CLAUDE.md, seção 6).
//
// Uso: npm run e2e [-- argumentos extras do `maestro test`]
// Precisa do build de desenvolvimento no aparelho, do Metro ligado e de
// `adb reverse tcp:8081 tcp:8081` (NOTAS-APP.md, passo 10).
//
// O Maestro não precisa estar no PATH: o script procura, nesta ordem,
// MAESTRO_HOME, ~/tools/maestro (onde foi instalado no Windows) e o PATH.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const QUIET_ENV = {
  MAESTRO_CLI_NO_ANALYTICS: 'true',
  MAESTRO_CLI_NO_UPDATE_CHECK: 'true',
  MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED: 'true',
};

/**
 * Caminho do executável do Maestro, ou o nome puro para buscar no PATH.
 * @param {{ env: Record<string, string | undefined>, platform: string, home: string, exists: (file: string) => boolean }} options
 * @returns {string}
 */
function resolveMaestro({ env, platform, home, exists }) {
  const binary = platform === 'win32' ? 'maestro.bat' : 'maestro';
  const candidates = [env.MAESTRO_HOME, path.join(home, 'tools', 'maestro')]
    .filter(Boolean)
    .map((dir) => path.join(dir, 'bin', binary));
  return candidates.find(exists) ?? binary;
}

function main(args) {
  const maestro = resolveMaestro({
    env: process.env,
    platform: process.platform,
    home: os.homedir(),
    exists: fs.existsSync,
  });
  const maestroArgs = ['test', '.maestro', ...args];
  // .bat no Windows só roda pelo cmd.exe. Chamado direto, e não com
  // `shell: true`, o Node escapa os argumentos.
  const [command, commandArgs] =
    process.platform === 'win32'
      ? ['cmd.exe', ['/d', '/s', '/c', maestro, ...maestroArgs]]
      : [maestro, maestroArgs];
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: { ...process.env, ...QUIET_ENV },
  });
  if (result.error) {
    console.error(`Não foi possível rodar o Maestro (${maestro}): ${result.error.message}`);
    return 2;
  }
  return result.status ?? 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { resolveMaestro, QUIET_ENV };
