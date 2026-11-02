// Gera o ícone provisório e neutro (spec 01, seção 4.2): um círculo
// simples, sem letra nem símbolo. Só usa o Node (zlib), sem dependências.
// Uso: node scripts/generate-placeholder-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BACKGROUND = [0x3f, 0x5a, 0x66]; // azul-acinzentado neutro
const FOREGROUND = [0xe8, 0xee, 0xf0];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

// pixel(x, y) devolve [r, g, b, a]
function png(size, pixel) {
  const row = size * 4 + 1;
  const raw = Buffer.alloc(row * size);
  for (let y = 0; y < size; y++) {
    raw[y * row] = 0; // sem filtro
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw.set([r, g, b, a], y * row + 1 + x * 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bits por canal
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Cobertura de um círculo centrado, com borda suavizada de 1 px.
function circleCoverage(size, radiusRatio, x, y) {
  const center = size / 2;
  const distance = Math.hypot(x + 0.5 - center, y + 0.5 - center);
  return Math.min(1, Math.max(0, size * radiusRatio - distance + 0.5));
}

function blend(from, to, t) {
  return from.map((value, i) => Math.round(value + (to[i] - value) * t));
}

const SIZE = 1024;
const outputs = {
  // ícone legado: fundo cheio com o círculo
  'icon.png': (x, y) => [...blend(BACKGROUND, FOREGROUND, circleCoverage(SIZE, 0.28, x, y)), 255],
  // ícone adaptativo: só o círculo, dentro da zona segura; o fundo vem da cor do app.config.ts
  'android-icon-foreground.png': (x, y) => [
    ...FOREGROUND,
    Math.round(255 * circleCoverage(SIZE, 0.2, x, y)),
  ],
  'android-icon-monochrome.png': (x, y) => [
    255,
    255,
    255,
    Math.round(255 * circleCoverage(SIZE, 0.2, x, y)),
  ],
};

mkdirSync('assets', { recursive: true });
for (const [name, pixel] of Object.entries(outputs)) {
  writeFileSync(`assets/${name}`, png(SIZE, pixel));
  console.log(`assets/${name}`);
}
