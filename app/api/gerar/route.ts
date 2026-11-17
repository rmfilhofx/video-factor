import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateVideo, generationSchema} from '../../../server/generate';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
    !request.headers.get('content-type')?.startsWith('application/json')) {
    return Response.json({error: 'Formato de solicitação inválido.'}, {status: 415});
  }
  const declared = Number(request.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared > 5000) return Response.json({error: 'Roteiro acima do limite.'}, {status: 413});
  const input = generationSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({error: 'Revise o roteiro, o formato, a duração e o estilo.'}, {status: 400});

  const dir = await mkdtemp(join(tmpdir(), 'video-factory-'));
  try {
    const {file, credits} = await generateVideo(input.data, dir, request.signal);
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-store',
        'X-Video-Credits': encodeURIComponent(JSON.stringify(credits)),
      },
    });
  } catch (error) {
    console.error('Falha na geração', error);
    return Response.json({error: 'Não foi possível concluir a geração. Tente novamente.'}, {status: 502});
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}
