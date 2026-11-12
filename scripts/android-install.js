// Compila o build de desenvolvimento e instala no aparelho, com limite de tempo
// em cada passo do `adb`. O `adb` às vezes trava sem dar erro, e o `installDebug`
// fica parado para sempre (NOTAS-APP.md, AP3). Aqui, ao estourar o tempo, o `adb`
// é reiniciado e a instalação tenta de novo, uma vez. Uma recusa também tenta de
// novo: em geral, é a verificação do Play Protect que estourou (AP4).
//
// Uso: npm run android:install
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

const PING_TIMEOUT_MS = 15_000;
const INSTALL_TIMEOUT_MS = 180_000;
const RESTART_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

/**
 * @param {{ ping: () => boolean, install: () => boolean, restart: () => void, log: (message: string) => void }} steps
 * @returns {boolean} se instalou
 */
function installWithRetry({ ping, install, restart, log }) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (ping() && install()) return true;
    log(`Tentativa ${attempt} de ${MAX_ATTEMPTS} sem sucesso.`);
    if (attempt < MAX_ATTEMPTS) restart();
  }
  return false;
}

function adb(args, timeout) {
  const result = spawnSync('adb', args, { stdio: 'inherit', timeout, killSignal: 'SIGKILL' });
  return !result.error && result.status === 0;
}

function restartAdb() {
  console.log('Reiniciando o adb.');
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/F', '/IM', 'adb.exe'], {
      stdio: 'ignore',
      timeout: RESTART_TIMEOUT_MS,
    });
  } else {
    spawnSync('pkill', ['-9', 'adb'], { stdio: 'ignore', timeout: RESTART_TIMEOUT_MS });
  }
  adb(['start-server'], RESTART_TIMEOUT_MS);
}

function assemble() {
  const android = path.join(ROOT, 'android');
  const [command, args] =
    process.platform === 'win32'
      ? [
          'cmd.exe',
          ['/d', '/s', '/c', path.join(android, 'gradlew.bat'), 'assembleDebug', '--console=plain'],
        ]
      : ['./gradlew', ['assembleDebug', '--console=plain']];
  const result = spawnSync(command, args, { cwd: android, stdio: 'inherit' });
  return !result.error && result.status === 0;
}

function main() {
  if (!assemble()) {
    console.error('O build falhou.');
    return 1;
  }
  const installed = installWithRetry({
    ping: () => adb(['shell', 'echo', 'ok'], PING_TIMEOUT_MS),
    install: () => adb(['install', '-r', APK], INSTALL_TIMEOUT_MS),
    restart: restartAdb,
    log: (message) => console.log(message),
  });
  if (!installed) {
    console.error(
      'Não foi possível instalar pelo adb. Confira o cabo e veja o AP3 no NOTAS-APP.md.',
    );
    return 1;
  }
  adb(['reverse', 'tcp:8081', 'tcp:8081'], PING_TIMEOUT_MS);
  console.log('Instalado.');
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { installWithRetry, MAX_ATTEMPTS };
