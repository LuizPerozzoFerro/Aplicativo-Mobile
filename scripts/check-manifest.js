// Verificação do manifesto Android (spec 01, seção 4.3; doc 02, seção 3.4).
// O build publicado não pode declarar a VPN nem as permissões que só serviam a
// ela e a um experimento do protótipo (decisão D6), nem a de origem da
// instalação, que o app não usa (decisão do responsável, 02/11/2026).
//
// Uso: node scripts/check-manifest.js [caminho/AndroidManifest.xml ...]
// Sem argumentos, confere os manifestos mesclados que o Gradle gerou em
// android/app/build (rodar depois de um build). O mesclado é o que vai no APK:
// inclui as permissões declaradas pelas bibliotecas.
const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_PERMISSIONS = [
  // D6: VPN e experimento do protótipo.
  'android.permission.BIND_VPN_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED',
  'android.permission.HIDE_OVERLAY_WINDOWS',
  // Origem da instalação (Install Referrer do Google Play). Vem com o
  // expo-application; bloqueada em android.blockedPermissions (app.config.ts).
  'com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE',
];

const VPN_SERVICE_ACTION = 'android.net.VpnService';

/**
 * Devolve a lista de problemas encontrados num manifesto (vazia se estiver limpo).
 * @param {string} xml
 * @returns {string[]}
 */
function findForbidden(xml) {
  const problems = [];
  const usesPermissions = xml.match(/<uses-permission(?:-sdk-23)?\b[^>]*>/g) ?? [];
  for (const tag of usesPermissions) {
    const permission = /android:name\s*=\s*"([^"]+)"/.exec(tag)?.[1];
    // tools:node="remove" é o bloqueio (blockedPermissions), não uma declaração.
    const removed = /tools:node\s*=\s*"remove"/.test(tag);
    if (permission && FORBIDDEN_PERMISSIONS.includes(permission) && !removed) {
      problems.push(`permissão proibida: ${permission}`);
    }
  }
  const services = xml.match(/<service\b[\s\S]*?(?:\/>|<\/service>)/g) ?? [];
  for (const service of services) {
    const name = /android:name\s*=\s*"([^"]+)"/.exec(service)?.[1] ?? '(sem nome)';
    if (service.includes('android.permission.BIND_VPN_SERVICE')) {
      problems.push(`serviço de VPN: ${name} (exige BIND_VPN_SERVICE)`);
    } else if (service.includes(`"${VPN_SERVICE_ACTION}"`)) {
      problems.push(`serviço de VPN: ${name} (responde a ${VPN_SERVICE_ACTION})`);
    }
  }
  return problems;
}

function findMergedManifests(root) {
  const buildDir = path.join(root, 'android', 'app', 'build', 'intermediates');
  if (!fs.existsSync(buildDir)) return [];
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'AndroidManifest.xml' && /merged_manifests?/.test(full)) {
        found.push(full);
      }
    }
  };
  walk(buildDir);
  return found;
}

function main(args) {
  const files = args.length > 0 ? args : findMergedManifests(process.cwd());
  if (files.length === 0) {
    console.error(
      'Nenhum manifesto mesclado encontrado. Rode um build antes (ex.: gradlew assembleRelease) ou passe o caminho do manifesto.',
    );
    return 2;
  }
  let failed = false;
  for (const file of files) {
    const problems = findForbidden(fs.readFileSync(file, 'utf8'));
    const label = path.relative(process.cwd(), file);
    if (problems.length === 0) {
      console.log(`OK   ${label}`);
    } else {
      failed = true;
      console.log(`FALHA ${label}`);
      for (const problem of problems) console.log(`      - ${problem}`);
    }
  }
  return failed ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { findForbidden, FORBIDDEN_PERMISSIONS };
