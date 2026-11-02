// Verificação do manifesto Android (spec 01, seção 4.3; doc 02, seção 3.4).
// O build publicado não pode declarar a VPN nem as permissões que só serviam a
// ela e a um experimento do protótipo (decisão D6).
//
// Uso: node scripts/check-manifest.js [caminho/AndroidManifest.xml ...]
// Sem argumentos, confere os manifestos mesclados que o Gradle gerou em
// android/app/build (rodar depois de um build). O mesclado é o que vai no APK:
// inclui as permissões declaradas pelas bibliotecas.
const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_PERMISSIONS = [
  'android.permission.BIND_VPN_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SYSTEM_EXEMPTED',
  'android.permission.HIDE_OVERLAY_WINDOWS',
];

const VPN_SERVICE_ACTION = 'android.net.VpnService';

/**
 * Devolve a lista de problemas encontrados num manifesto (vazia se estiver limpo).
 * @param {string} xml
 * @returns {string[]}
 */
function findForbidden(xml) {
  const problems = [];
  for (const permission of FORBIDDEN_PERMISSIONS) {
    const usesPermission = new RegExp(
      `<uses-permission(?:-sdk-23)?\\b[^>]*android:name\\s*=\\s*"${permission.replace(/\./g, '\\.')}"`,
    );
    if (usesPermission.test(xml)) problems.push(`permissão proibida: ${permission}`);
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
