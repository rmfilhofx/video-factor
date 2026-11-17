import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, selectComposition} from '@remotion/renderer';
import {randomUUID} from 'node:crypto';
import {mkdir, readFile, realpath, rename, rm, stat} from 'node:fs/promises';
import {basename, dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {videoSchema} from '../src/spec.ts';

const project = fileURLToPath(new URL('../', import.meta.url));
const root = await realpath(resolve(project, 'public'));

async function readPreset(path) {
  const input = videoSchema.parse(JSON.parse(await readFile(path, 'utf8')));
  const assets = [...input.scenes.map((scene) => scene.media?.src), input.audio?.cue, input.audio?.bed];
  for (const asset of new Set(assets.filter(Boolean))) {
    try {
      const file = await realpath(resolve(root, asset));
      const local = relative(root, file);
      if (isAbsolute(local) || local === '..' || local.startsWith('..' + sep) || !(await stat(file)).isFile()) {
        throw new Error('Asset fora de public/ ou não é um arquivo');
      }
    } catch (error) {
      throw new Error(`Asset inválido: public/${asset}`, {cause: error});
    }
  }
  return {video: input};
}

async function loadJobs(args) {
  if (args[0] === '--batch') {
    if (args.length !== 2) throw new Error('Uso: npm run batch -- <manifesto.json>');
    const manifest = resolve(args[1]);
    const {jobs} = JSON.parse(await readFile(manifest, 'utf8'));
    if (!Array.isArray(jobs) || jobs.length === 0) throw new Error('O manifesto precisa ter pelo menos um job.');
    return Promise.all(jobs.map(async ({preset, output}) => ({
      inputProps: await readPreset(resolve(dirname(manifest), preset)),
      output: resolve(dirname(manifest), output),
    })));
  }
  if (args.length > 2) throw new Error('Uso: npm run render -- [preset.json] [saída.mp4]');
  const [preset = resolve(project, 'presets/gta6-promo.json'), output = resolve(project, 'out/GTA6Promo.mp4')] = args;
  return [{inputProps: await readPreset(resolve(preset)), output: resolve(output)}];
}

async function main() {
  const jobs = await loadJobs(process.argv.slice(2));
  const outputs = jobs.map(({output}) => output);
  if (new Set(outputs).size !== outputs.length || outputs.some((output) => !output.endsWith('.mp4'))) {
    throw new Error('Cada job precisa de um caminho .mp4 exclusivo.');
  }
  const serveUrl = await bundle({entryPoint: resolve(project, 'src/index.ts'), publicDir: root});
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
  let browser;
  try {
    browser = await openBrowser('chrome', {browserExecutable});
    for (const {output, inputProps} of jobs) {
      await mkdir(dirname(output), {recursive: true});
      const temp = resolve(dirname(output), `.${basename(output)}.${randomUUID()}.mp4`);
      try {
        const composition = await selectComposition({serveUrl, id: 'GTA6Promo', inputProps, puppeteerInstance: browser});
        let reported = -1;
        await renderMedia({
          serveUrl, composition, inputProps, puppeteerInstance: browser, outputLocation: temp,
          codec: 'h264', pixelFormat: 'yuv420p', crf: 19, concurrency: 2,
          licenseKey: process.env.REMOTION_PRIVATE_LICENSE_KEY || undefined,
          onProgress: ({progress}) => {
            const step = Math.floor(progress * 10);
            if (step !== reported) {
              console.log(`${basename(output)} · ${step * 10}%`);
              reported = step;
            }
          },
        });
        await rename(temp, output);
        console.log(output);
      } finally {
        await rm(temp, {force: true});
      }
    }
  } finally {
    try {
      await browser?.close({silent: true});
    } finally {
      await rm(serveUrl, {recursive: true, force: true});
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
