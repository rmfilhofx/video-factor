import {spawn} from 'node:child_process';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {z} from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 180;

const schema = z.object({
  startSeconds: z.number().min(0).max(72000),
  endSeconds: z.number().min(0).max(72000),
  cameraPosition: z.enum(['top-left', 'top-right', 'none']),
  cameraSize: z.enum(['small', 'medium']),
  hook: z.string().max(120),
  hookDuration: z.number().min(0.1).max(1),
  cta: z.string().max(120),
}).refine(x => x.endSeconds > x.startSeconds && x.endSeconds - x.startSeconds <= 45);
const maxUpload = 3_500_000;
const maxOutput = 4_200_000;
const font = join(process.cwd(), 'server/fonts/DejaVuSans-Bold.ttf');
const ffmpeg = process.env.FFMPEG_PATH || join(process.cwd(), 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg');

function drawText(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9 @!?.,_-]/g, '').replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function execute(args: string[], signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpeg, args, {stdio: ['ignore', 'ignore', 'pipe']});
    let errorText = '';
    child.stderr.on('data', (chunk: Buffer) => {errorText = (errorText + chunk.toString()).slice(-3000);});
    const abort = () => child.kill('SIGKILL');
    signal.addEventListener('abort', abort, {once: true});
    child.on('error', reject);
    child.on('close', code => {signal.removeEventListener('abort', abort); code === 0 ? resolve() : reject(new Error('FFmpeg failed: ' + errorText));});
  });
}

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({error: 'Origem inválida.'}, {status: 403});
  const length = Number(request.headers.get('content-length'));
  if (!Number.isFinite(length) || length > maxUpload + 10000) return Response.json({error: 'Para esta prévia, envie um arquivo de até 3,5 MB.'}, {status: 413});
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return Response.json({error: 'Formato inválido.'}, {status: 415});
  const form = await request.formData().catch(() => null);
  const video = form?.get('video');
  const raw = form?.get('settings');
  if (!(video instanceof File) || video.size > maxUpload || video.size === 0 || typeof raw !== 'string') return Response.json({error: 'Envie um vídeo válido e as configurações.'}, {status: 400});
  let settings: unknown;
  try {settings = JSON.parse(raw);} catch {return Response.json({error: 'Configuração JSON inválida.'}, {status: 400});}
  const parsed = schema.safeParse(settings);
  if (!parsed.success) return Response.json({error: 'Configurações de corte inválidas.'}, {status: 400});
  const opts = parsed.data;
  const dir = await mkdtemp(join(tmpdir(), 'clip-factory-'));
  try {
    const source = join(dir, 'input.mp4');
    const output = join(dir, 'output.mp4');
    await writeFile(source, new Uint8Array(await video.arrayBuffer()));
    const seconds = opts.endSeconds - opts.startSeconds;
    const hook = drawText(opts.hook);
    const cta = drawText(opts.cta);
    const hookFrames = Math.max(1, Math.round(opts.hookDuration * 30));
    const base = '[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg]';
    const camWidth = opts.cameraSize === 'small' ? 420 : 540;
    const camHeight = Math.round(camWidth * 9 / 16);
    const cameraX = opts.cameraPosition === 'top-right' ? 1080 - camWidth - 28 : 28;
    const cam = opts.cameraPosition === 'none' ? '[bg]null[composed]' : `[0:v]crop=iw*0.27:ih*0.29:${opts.cameraPosition === 'top-right' ? 'iw*0.73' : '0'}:0,scale=${camWidth}:${camHeight}:flags=lanczos[cam];[bg][cam]overlay=${cameraX}:300[composed]`;
    const filter = `${base};${cam};[composed]drawtext=fontfile='${font}':text='${hook}':fontsize=55:fontcolor=yellow:borderw=5:bordercolor=black:x=(w-text_w)/2:y=120:enable='lt(n,${hookFrames})',drawtext=fontfile='${font}':text='${cta}':fontsize=47:fontcolor=white:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h-270:enable='gte(t,${Math.max(0, seconds-3).toFixed(3)})'[v]`;
    await execute(['-hide_banner','-loglevel','error','-ss',String(opts.startSeconds),'-i',source,'-t',String(seconds),'-filter_complex',filter,'-map','[v]','-map','0:a?','-c:v','libx264','-preset','veryfast','-b:v','620k','-maxrate','750k','-bufsize','1500k','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','64k','-movflags','+faststart','-y',output], request.signal);
    const bytes = await readFile(output);
    if (bytes.byteLength > maxOutput) return Response.json({error: 'O resultado excedeu o limite desta prévia. Escolha um trecho menor.'}, {status: 413});
    return new Response(new Uint8Array(bytes), {headers: {'Content-Type':'video/mp4','Content-Disposition':'attachment; filename="clip-factory.mp4"','Cache-Control':'no-store'}});
  } catch (error) {
    console.error('Erro de renderização Clip Factory', error);
    return Response.json({error: 'Não foi possível renderizar este arquivo. Use MP4 H.264 e tente um trecho menor.'}, {status: 502});
  } finally {await rm(dir, {recursive: true, force: true});}
}
