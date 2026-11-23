#!/usr/bin/env node
// Publicação do conteúdo no Cloudflare R2 (spec 04, 5.2), pelo Wrangler.
//
//   npm run content:publish -- --dry-run   # valida e mostra o que enviaria, sem credencial
//   npm run content:publish                # valida, envia e confere pelo endereço público
//
// Ordem: valida o catálogo (os testes do catálogo), confere que cada vídeo do
// catálogo existe em content/videos/, envia os vídeos e só depois o catálogo (o
// app nunca vê um catálogo que aponta para um vídeo ainda não enviado) e, no fim,
// lê tudo de volta pelo endereço público.
//
// Credencial (só na máquina do responsável, nunca no repositório, no CI nem em
// log): token de API da Cloudflare só com a permissão do R2, guardado no
// Gerenciador de Credenciais do Windows como credencial genérica
// (scripts/content-hosting.json, `credentialTarget`), com o ID da conta no
// usuário e o token na senha. Alternativa: CLOUDFLARE_API_TOKEN e
// CLOUDFLARE_ACCOUNT_ID no ambiente. O token vai só para o processo do Wrangler
// e nunca é impresso.
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const hosting = require('./content-hosting.json');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const VIDEOS = path.join(CONTENT, 'videos');
const WRANGLER = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const JEST = path.join(ROOT, 'node_modules', 'jest', 'bin', 'jest.js');

// O app consulta o catálogo no máximo uma vez por dia: cache curto basta para uma
// correção chegar logo. O vídeo muda de identificador quando muda: cache longo.
const CATALOG_HEADERS = {
  contentType: 'application/json; charset=utf-8',
  cacheControl: 'public, max-age=300',
};
const VIDEO_HEADERS = {
  contentType: 'video/mp4',
  cacheControl: 'public, max-age=31536000, immutable',
};

const CATALOG_FILE = /^catalog\.([A-Za-z]{2}(?:-[A-Za-z]{2})?)\.json$/;
const VIDEO_ID = /^[a-z0-9]{4,32}$/; // a mesma regra de src/domain/catalog.ts

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

function validateCatalogs() {
  console.log('1. Validando o catálogo (testes do catálogo)...');
  const result = spawnSync(
    process.execPath,
    [JEST, 'src/domain/catalog.test.ts', 'src/features/content/embedded.test.ts', '--silent'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    fail(`Catálogo recusado pelos testes. Nada foi enviado.\n${result.stderr || result.stdout}`);
  }
}

function planUploads() {
  const catalogs = fs
    .readdirSync(CONTENT)
    .filter((name) => CATALOG_FILE.test(name))
    .sort();
  if (catalogs.length === 0) fail('Nenhum catálogo (catalog.<idioma>.json) em content/.');

  const videoIds = new Set();
  for (const name of catalogs) {
    const catalog = JSON.parse(fs.readFileSync(path.join(CONTENT, name), 'utf8'));
    for (const { milestones } of Object.values(catalog.compulsions)) {
      for (const milestone of milestones) {
        if (milestone.video) videoIds.add(milestone.video.id);
      }
    }
  }

  const missing = [...videoIds].filter((id) => !fs.existsSync(path.join(VIDEOS, `${id}.mp4`)));
  if (missing.length > 0) {
    fail(
      `Vídeos do catálogo sem arquivo em content/videos/: ${missing.join(', ')}. Nada foi enviado.`,
    );
  }
  const extra = fs.existsSync(VIDEOS)
    ? fs
        .readdirSync(VIDEOS)
        .filter((name) => !videoIds.has(name.replace(/\.mp4$/, '')))
        .sort()
    : [];
  if (extra.length > 0) console.log(`   Fora do catálogo, não serão enviados: ${extra.join(', ')}`);

  const videos = [...videoIds].sort().map((id) => {
    if (!VIDEO_ID.test(id)) fail(`Identificador de vídeo inválido: ${id}`);
    return { key: `videos/${id}.mp4`, file: path.join(VIDEOS, `${id}.mp4`), ...VIDEO_HEADERS };
  });
  const catalogUploads = catalogs.map((name) => ({
    key: name,
    file: path.join(CONTENT, name),
    ...CATALOG_HEADERS,
  }));
  return [...videos, ...catalogUploads];
}

// Lê a credencial genérica do Gerenciador de Credenciais do Windows (CredReadW),
// sem módulo extra. Devolve null se não existir.
function readWindowsCredential(target) {
  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class QuedoCredential {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  static extern bool CredReadW(string target, int type, int flags, out IntPtr credential);
  [DllImport("advapi32.dll")]
  static extern void CredFree(IntPtr credential);
  public static string[] Read(string target) {
    IntPtr pointer;
    if (!CredReadW(target, 1, 0, out pointer)) return null;
    try {
      var c = (CREDENTIAL)Marshal.PtrToStructure(pointer, typeof(CREDENTIAL));
      var secret = c.CredentialBlobSize > 0 ? Marshal.PtrToStringUni(c.CredentialBlob, c.CredentialBlobSize / 2) : "";
      return new[] { c.UserName ?? "", secret };
    } finally { CredFree(pointer); }
  }
}
'@
$found = [QuedoCredential]::Read('${target}')
if ($found -eq $null) { exit 3 }
[Console]::Out.Write((ConvertTo-Json -Compress -InputObject @($found[0], $found[1])))
`;
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64'),
    ],
    { encoding: 'utf8', windowsHide: true },
  );
  if (result.status === 3) return null;
  if (result.status !== 0) fail('Não consegui ler o Gerenciador de Credenciais do Windows.');
  const [accountId, token] = JSON.parse(result.stdout);
  return { accountId: accountId.trim(), token: token.trim() };
}

function readCredential() {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN;
  if (fromEnv) {
    if (!process.env.CLOUDFLARE_ACCOUNT_ID) fail('Falta CLOUDFLARE_ACCOUNT_ID no ambiente.');
    return { accountId: process.env.CLOUDFLARE_ACCOUNT_ID.trim(), token: fromEnv.trim() };
  }
  const stored =
    process.platform === 'win32' ? readWindowsCredential(hosting.credentialTarget) : null;
  if (!stored) {
    fail(
      `Credencial não encontrada. Crie no Gerenciador de Credenciais do Windows uma ` +
        `credencial genérica "${hosting.credentialTarget}" (usuário: ID da conta; senha: ` +
        `token), como no NOTAS-APP.md (Fase 5, passo 2).`,
    );
  }
  if (!/^[0-9a-f]{32}$/.test(stored.accountId)) {
    fail(`O usuário da credencial "${hosting.credentialTarget}" não parece um ID de conta.`);
  }
  if (stored.token.length < 20) fail('A senha da credencial não parece um token.');
  return stored;
}

function upload(item, credential) {
  const result = spawnSync(
    process.execPath,
    [
      WRANGLER,
      'r2',
      'object',
      'put',
      `${hosting.bucket}/${item.key}`,
      '--file',
      item.file,
      '--content-type',
      item.contentType,
      '--cache-control',
      item.cacheControl,
      '--remote',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: credential.token,
        CLOUDFLARE_ACCOUNT_ID: credential.accountId,
        // Sem telemetria do Wrangler (CLAUDE.md, seção 6: nada de analytics).
        WRANGLER_SEND_METRICS: 'false',
      },
    },
  );
  if (result.status !== 0) {
    // A saída do Wrangler não traz o token; ainda assim, nada que o contenha é impresso.
    const output = `${result.stdout}\n${result.stderr}`.split(credential.token).join('<token>');
    fail(`Falha ao enviar ${item.key}. O que já foi enviado continua no bucket.\n${output}`);
  }
}

async function verifyPublic(uploads) {
  console.log(`4. Conferindo pelo endereço público (${hosting.r2DevUrl})...`);
  const problems = [];
  for (const item of uploads) {
    const response = await fetch(`${hosting.r2DevUrl}/${item.key}`, { cache: 'no-store' });
    const body = Buffer.from(await response.arrayBuffer());
    const local = fs.readFileSync(item.file);
    const type = response.headers.get('content-type');
    const cache = response.headers.get('cache-control');
    const ok =
      response.status === 200 &&
      body.equals(local) &&
      type === item.contentType &&
      cache === item.cacheControl;
    console.log(`   ${ok ? 'ok  ' : 'ERRO'} ${item.key}  ${response.status}  ${type}  ${cache}`);
    if (!ok) problems.push(item.key);
  }
  if (problems.length > 0) fail(`Diferente do repositório: ${problems.join(', ')}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  validateCatalogs();
  console.log('2. Conferindo os arquivos...');
  const uploads = planUploads();
  for (const item of uploads) {
    const kb = Math.max(1, Math.round(fs.statSync(item.file).size / 1024));
    console.log(`   ${item.key}  ${kb} KB  ${item.contentType}  ${item.cacheControl}`);
  }
  if (dryRun) {
    console.log(`\nSimulação: nada foi enviado ao bucket "${hosting.bucket}".`);
    return;
  }
  const credential = readCredential();
  console.log(`3. Enviando ${uploads.length} arquivos ao bucket "${hosting.bucket}"...`);
  for (const item of uploads) {
    upload(item, credential);
    console.log(`   enviado ${item.key}`);
  }
  await verifyPublic(uploads);
  console.log('\nPublicação concluída.');
}

main().catch((error) => fail(error.message));
