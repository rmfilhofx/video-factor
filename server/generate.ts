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
  prompt: z.string().trim().min(1).max(750),
  format: z.enum(['9:16', '16:9', '1:1']),
  seconds: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
  style: z.enum(['Cinematográfico', 'Minimalista', 'Editorial', 'Neon']),
});

type Generation = z.infer<typeof generationSchema>;
const ignored = new Set('crie criar faça gerar gere quero vídeo video cinematico cinematográfico sobre uma um dos das para com the and make about imagens fotos mostrando mostrando estilo segundos imagem foto meus meu minha seu seja faça usando use criar suas this that for your with from into faça texto produza animação de do da ao um uma o a as os e'.split(' '));
const translation: Record<string, string> = {
  praia: 'beach', praias: 'beach', cidade: 'city', urbana: 'urban', floresta: 'forest',
  montanha: 'mountain', montanhas: 'mountain', mar: 'ocean', oceano: 'ocean',
  noite: 'night', noturna: 'night', carros: 'cars', carro: 'car', natureza: 'nature',
  deserto: 'desert', pôr: 'sunset', cachoeira: 'waterfall', animais: 'animals', gatos: 'cats',
  viagem: 'travel', chuva: 'rain', neve: 'snow', espaço: 'space', futebol: 'football', café: 'coffee', culinária: 'cooking', receita: 'cooking',
  cozinha: 'kitchen', produto: 'product', produtos: 'products', loja: 'shop', negócio: 'business',
  tecnologia: 'technology', robôs: 'robots', ciência: 'science', educação: 'education',
  música: 'music', dança: 'dance', esporte: 'sport', corrida: 'running', cachorro: 'dog',
  fazenda: 'farm', comida: 'food', livro: 'book', moda: 'fashion', casamento: 'wedding',
};

function terms(text: string) {
  return (text.toLowerCase().replace(/p[oô]r do sol/gu, 'sunset').match(/[\p{L}\p{N}]+/gu) ?? [])
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

const fallbackCredit: Credit = {
  title: 'Ripples in Calm Water at Lake Mead',
  author: 'Andrew Cattoir (Lake Mead National Recreation Area)',
  license: 'Public domain',
  source: 'https://commons.wikimedia.org/wiki/File:Ripples_in_Calm_Water_at_Lake_Mead_(e082fea3-1c90-4bf1-b543-00d8348e5c69).jpg',
  illustrative: true,
};

async function findPhotos(caption: string) {
  const query = terms(caption);
  if (!query) return [];

  const words = query.split(' ');
  const broader = words.slice(0, 2).join(' ');
  const [exact, broad] = await Promise.all([
    photosFor(query).catch(() => []),
    broader === query ? Promise.resolve([]) : photosFor(broader).catch(() => []),
  ]);
  return [...new Map([...exact, ...broad].map((photo) => [photo.url, photo])).values()];
}

export async function generateVideo(input: Generation, dir: string, signal: AbortSignal) {
  const [width, height] = formats[input.format];
  const style = styles[input.style];
  const captions = input.prompt.split(/\n+|(?<=[.!?])\s+/u).map((line) => line.trim()).filter(Boolean).slice(0, 3);
  const matches = await Promise.all(captions.map(findPhotos));
  const descriptions = captions.length === 1 && matches[0].length >= 3
    ? [captions[0], captions[0], captions[0]]
    : captions;
  const credits: Credit[] = [];
  const used = new Set<string>();

  async function preparePhoto(input: string | Buffer, index: number) {
    await sharp(input, {limitInputPixels: 16_000_000}).rotate()
      .resize(width, height, {fit: 'cover', position: 'attention'})
      .jpeg({quality: 88}).toFile(join(dir, `scene-${index}.jpg`));
  }

  for (let index = 0; index < descriptions.length; index++) {
    signal.throwIfAborted();
    const candidates = (matches[captions.length === 1 ? 0 : index] ?? [])
      .filter((photo) => !used.has(photo.url)).slice(0, 2);
    let credit = fallbackCredit;
    for (const {url, ...candidate} of candidates) {
      try {
        await preparePhoto(await downloadPhoto(url), index);
        used.add(url);
        credit = candidate;
        break;
      } catch {
        signal.throwIfAborted();
      }
    }
    if (credit.illustrative) {
      await preparePhoto(join(process.cwd(), 'server/media/lake-mead.jpg'), index);
    }
    credits.push(credit);
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
    await writeFile(join(dir, `credit-${i}.txt`), wrap(`${credit.illustrative ? "Foto ilustrativa · " : ""}${credit.author} · ${credit.license} · Wikimedia Commons`, 51, 3));
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
  return {file, credits: [...new Map(credits.map((credit) => [credit.source, credit])).values()]};
}
