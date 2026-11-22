#!/usr/bin/env node
// Servidor falso do conteúdo (spec 04, passo 1): serve uma pasta por HTTP no
// computador, para testar a atualização do catálogo no aparelho antes do R2.
//
//   npm run content:serve                 # serve content/ na porta 8090
//   npm run content:serve -- <pasta> <porta>
//
// No aparelho: `adb reverse tcp:8090 tcp:8090` e o Metro iniciado com
// CONTENT_BASE_URL=http://localhost:8090. Só leitura (GET e HEAD), só arquivos
// dentro da pasta, e nada de registro dos pedidos além da linha no terminal.
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', 'content'));
const port = Number(process.argv[3] || 8090);

const TYPES = { '.json': 'application/json; charset=utf-8', '.mp4': 'video/mp4' };

if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Pasta não encontrada: ${root}`);
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const method = request.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname}`);
  const inside = file === root || file.startsWith(root + path.sep);
  if (!inside || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    console.log(`${method} ${pathname} 404`);
    response.writeHead(404).end();
    return;
  }
  const type = TYPES[path.extname(file)] || 'application/octet-stream';
  console.log(`${method} ${pathname} 200`);
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  if (method === 'HEAD') response.end();
  else fs.createReadStream(file).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Conteúdo de ${root} em http://localhost:${port}`);
});
