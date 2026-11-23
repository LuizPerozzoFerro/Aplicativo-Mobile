#!/usr/bin/env node
// Vídeos de teste do conteúdo (spec 04, 5.1): um MP4 720p para cada vídeo do
// catálogo, com cor de fundo, a letra da compulsão (A ou B), o dia do marco e um
// contador de segundos. Sem pessoas, vozes nem músicas (sem trilha de áudio).
//
//   npm run content:test-videos             # gera em content/videos/
//   FFMPEG=<caminho do ffmpeg.exe> npm run content:test-videos
//
// O ffmpeg é ferramenta só do computador (fora do app e do repositório). Os vídeos
// reais da Fase 7 não passam por aqui: este script é só para o conteúdo de teste.
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG = path.join(ROOT, 'content', 'catalog.pt-BR.json');
const OUT = path.join(ROOT, 'content', 'videos');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || FFMPEG.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');

// Letra e cor de cada compulsão: distingue no aparelho sem citar o tema.
const LOOK = {
  pornography: { letter: 'A', color: '0x3F5A66' },
  short_videos: { letter: 'B', color: '0x6A4F7A' },
};

// Fonte do Windows; em outra máquina, FONT=<arquivo .ttf>.
const FONT = process.env.FONT || 'C:/Windows/Fonts/arial.ttf';

function escapeFilterPath(file) {
  // No filtro do ffmpeg, ":" separa opções: precisa de escape.
  return file.replace(/\\/g, '/').replace(/:/g, '\\:');
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} terminou com ${result.status}:\n${result.stderr}`);
  }
  return result.stdout;
}

function main() {
  if (!fs.existsSync(FONT)) throw new Error(`Fonte não encontrada: ${FONT} (use FONT=...)`);
  const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const font = escapeFilterPath(FONT);

  let count = 0;
  for (const [compulsion, { milestones }] of Object.entries(catalog.compulsions)) {
    const look = LOOK[compulsion];
    if (!look) throw new Error(`Compulsão sem aparência definida no script: ${compulsion}`);
    for (const milestone of milestones) {
      if (!milestone.video) continue;
      const { id, durationSeconds } = milestone.video;
      const file = path.join(OUT, `${id}.mp4`);
      const days = `${milestone.day} ${milestone.day === 1 ? 'dia' : 'dias'}`;
      const text = (value, size, y) =>
        `drawtext=fontfile='${font}':text='${value}':fontsize=${size}:fontcolor=white:` +
        `x=(w-text_w)/2:y=${y}`;
      const filters = [
        text('Vídeo de teste', 48, 'h*0.22'),
        text(`${look.letter} · ${days}`, 120, '(h-text_h)/2'),
        // Contador: mostra que o vídeo está tocando e onde parou.
        text('%{eif\\:t\\:d} s', 40, 'h*0.72'),
      ].join(',');
      run(FFMPEG, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=${look.color}:s=1280x720:r=30:d=${durationSeconds}`,
        '-vf',
        filters,
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-pix_fmt',
        'yuv420p',
        '-crf',
        '28',
        '-preset',
        'slow',
        // Sem metadados de origem; o moov no início deixa começar a tocar antes do fim do download.
        '-map_metadata',
        '-1',
        '-movflags',
        '+faststart',
        file,
      ]);
      const probed = Number(
        run(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]),
      );
      if (Math.abs(probed - durationSeconds) > 0.5) {
        throw new Error(`${id}.mp4 tem ${probed} s; o catálogo diz ${durationSeconds} s`);
      }
      const kb = Math.round(fs.statSync(file).size / 1024);
      console.log(`${id}.mp4  ${look.letter} ${days}  ${probed.toFixed(1)} s  ${kb} KB`);
      count += 1;
    }
  }
  console.log(`${count} vídeos em ${path.relative(ROOT, OUT)}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
