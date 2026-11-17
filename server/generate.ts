import {execFile} from 'node:child_process';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {promisify} from 'node:util';
import sharp from 'sharp';
import {z} from 'zod';
import {downloadPhoto, photosFor, type Credit} from './commons';

const run = promisify(execFile);
const formats = {'9:16': [540, 960], '16:9': [960, 540], '1:1': [720, 720]} as const;
const styles = {
  Cinematográfico: {accent: 'FFD5A0', zoom: 0.0012, opacity: 0.64},
  Minimalista: {accent: 'FFFFFF', zoom: 0.00035, opacity: 0.56},
  Editorial: {accent: 'A6DFFF', zoom: 0.0007, opacity: 0.60},
  Neon: {accent: 'D9ADFF', zoom: 0.0017, opacity: 0.68},
} as const;

export const generationSchema = z.object({
  prompt: z.string().trim().min(8).max(750),
  format: z.enum(['9:16', '16:9', '1:1']),
  seconds: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
  style: z.enum(['Cinematográfico', 'Minimalista', 'Editorial', 'Neon']),
});

type Generation = z.infer<typeof generationSchema>;
const ignored = new Set('crie criar faça gerar gere quero vídeo video cinematico cinematográfico sobre uma um dos das para com the and make about imagens fotos mostrando mostrando estilo segundos imagem foto'.split(' '));
const translation: Record<string, string> = {
  praia: 'beach', praias: 'beach', cidade: 'city', urbana: 'urban', floresta: 'forest',
  montanha: 'mountain', montanhas: 'mountain', mar: 'ocean', oceano: 'ocean',
  noite: 'night', noturna: 'night', carros: 'cars', carro: 'car', natureza: 'nature',
  deserto: 'desert', pôr: 'sunset', cachoeira: 'waterfall', animais: 'animals', gatos: 'cats',
  viagem: 'travel', chuva: 'rain', neve: 'snow', espaço: 'space', futebol: 'football',
};

function terms(text: string) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 3 && !ignored.has(word))
    .slice(0, 4).map((word) => translation[word] ?? word).join(' ');
}

function wrap(text: string, width: number, maxLines: number) {
  const lines: string[] = [];
  for (const word of text.trim().split(/\s+/u)) {
    const last = lines.at(-1);
    if (last && last.length + 1 + word.length <= width) {
      lines[lines.length - 1] += ' ' + word;
    } else {
      if (lines.length === maxLines) return lines.join('\n') + '…';
      lines.push(word.length > width ? word.slice(0, width - 1) + '…' : word);
    }
  }
  return lines.join('\n');
}

export class NoPhotosError extends Error {}

export async function generateVideo(input: Generation, dir: string, signal: AbortSignal) {
  const [width, height] = formats[input.format];
  const style = styles[input.style];
  const captions = input.prompt.split(/\n+|(?<=[.!?])\s+/u).map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const queries = [...new Set([...captions.map(terms), terms(input.prompt)].filter(Boolean))];
  if (queries.length === 0) throw new NoPhotosError('Inclua um tema ou local para buscar fotos.');
  const results = await Promise.allSettled(queries.map(photosFor));
  if (results.every((result) => result.status === 'rejected')) throw results[0].reason;
  const matches = results.map((result) => result.status === 'fulfilled' ? result.value : []);
  const attempts = Array.from({length: 8}, (_, rank) => matches.flatMap((photos, series) => {
    const photo = photos[rank];
    return photo ? [{photo, series}] : [];
  })).flat();
  const seen = new Set<string>();
  const unique = attempts.filter(({photo}) => {
    if (seen.has(photo.url)) return false;
    seen.add(photo.url);
    return true;
  }).slice(0, 8);
  const credits: Credit[] = [];
  const descriptions: string[] = [];
  for (const {photo, series} of unique) {
    signal.throwIfAborted();
    if (credits.length === 3) break;
    try {
      const bytes = await downloadPhoto(photo.url);
      await sharp(bytes, {limitInputPixels: 16_000_000}).rotate()
        .resize(width, height, {fit: 'cover', position: 'attention'})
        .jpeg({quality: 88}).toFile(join(dir, `scene-${credits.length}.jpg`));
    } catch {
      continue;
    }
    const {url: _url, ...credit} = photo;
    credits.push(credit);
    descriptions.push(captions.find((line) => terms(line) === queries[series]) ?? captions[0]);
  }
  if (!credits.length) {
    throw new NoPhotosError('Sem fotos adequadas com licença compatível. Tente um tema mais específico, como “praias de Miami” ou “montanhas dos Alpes”.');
  }

  const fps = 24;
  const frames = input.seconds * fps;
  const font = join(process.cwd(), 'server/fonts/DejaVuSans-Bold.ttf');
  const ffmpeg = process.platform === 'linux' && process.arch === 'x64'
    ? join(process.cwd(), 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg')
    : 'ffmpeg';
  const args = ['-hide_banner', '-loglevel', 'error', '-y'];
  const filters: string[] = [];
  const size = Math.round(width * 0.049);
  const creditSize = Math.round(width * 0.022);
  const count = credits.length;
  for (const [i, credit] of credits.entries()) {
    const frameCount = Math.floor(frames * (i + 1) / count) - Math.floor(frames * i / count);
    const caption = wrap(descriptions[i], 28, 3);
    await writeFile(join(dir, `title-${i}.txt`), caption);
    await writeFile(join(dir, `credit-${i}.txt`), wrap(`${credit.author} · ${credit.license} · Wikimedia Commons`, 51, 3));
    args.push('-i', `scene-${i}.jpg`);
    const pad = Math.round(width * 0.055);
    filters.push(
      `[${i}:v]scale=${width * 2}:${height * 2},zoompan=z='min(1+on*${style.zoom},1.22)':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frameCount}:s=${width}x${height}:fps=${fps},setsar=1,` +
      `drawbox=x=0:y=ih*0.61:w=iw:h=ih*0.39:color=black@${style.opacity}:t=fill,` +
      `drawtext=fontfile='${font}':textfile=title-${i}.txt:expansion=none:fontcolor=0x${style.accent}:fontsize=${size}:x=${pad}:y=h*0.65:line_spacing=7,` +
      `drawtext=fontfile='${font}':textfile=credit-${i}.txt:expansion=none:fontcolor=white:fontsize=${creditSize}:x=${pad}:y=h-text_h-${pad}[v${i}]`,
    );
  }
  filters.push(credits.map((_, i) => `[v${i}]`).join('') + `concat=n=${count}:v=1:a=0[out]`);
  const output = 'video.mp4';
  const bitrate = Math.min(1450, Math.floor(29000 / input.seconds));
  const provenance = credits.map(({title, author, license, source}) =>
    `${title} — ${author} (${license}), cropped and animated: ${source}`).join(' | ');
  await run(ffmpeg, [...args, '-filter_complex_threads', '1', '-filter_complex', filters.join(';'), '-map', '[out]',
    '-threads', '2', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-crf', '23', '-maxrate', `${bitrate}k`, '-bufsize', `${bitrate}k`, '-metadata', `comment=${provenance}`, '-movflags', '+faststart', output],
  {cwd: dir, timeout: 95_000, signal});
  const file = await readFile(join(dir, output));
  if (file.length > 4_300_000) throw new Error('O MP4 ficou acima do limite. Selecione uma duração menor.');
  return {file, credits};
}
