import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {buildTimeline, durationOf, format, videoSchema} from '../src/spec.ts';

const preset = JSON.parse(readFileSync(new URL('../presets/gta6-promo.json', import.meta.url), 'utf8'));

test('GTA6Promo mantém os cinco segmentos do roteiro e o formato vertical', () => {
  const {scenes} = videoSchema.parse(preset);
  assert.deepEqual(format, {width: 1080, height: 1920, fps: 30});
  assert.deepEqual(buildTimeline(scenes).map(({from}) => from), [0, 120, 240, 390, 510]);
  assert.equal(durationOf(scenes), 600);
  assert.deepEqual(scenes.map(({lines}) => lines.join(' ')), [
    'A ESPERA ESTÁ ACABANDO', 'GTA 6 ESTÁ CHEGANDO', 'UMA NOVA HISTÓRIA COMEÇA',
    'VOU TRANSMITIR TUDO AO VIVO', 'SIGA O PERFIL E NÃO PERCA',
  ]);
});

test('a edição da duração recalcula todos os cortes subsequentes', () => {
  const {scenes} = videoSchema.parse(preset);
  scenes[0].durationInFrames = 30;
  assert.deepEqual(buildTimeline(scenes).map(({from}) => from), [0, 30, 150, 300, 420]);
  assert.equal(durationOf(scenes), 510);
});

test('aceita mídia relativa e rejeita percursos, URLs e cenas inválidas', () => {
  const scene = preset.scenes[0];
  const withAsset = (src) => ({scenes: [{...scene, media: {kind: 'video', src}}]});
  assert.equal(videoSchema.safeParse(withAsset('clipes/trailer autorizado.mp4')).success, true);
  for (const path of ['../private.mp4', 'https://example.org/video.mp4', '/video.mp4', 'a/../video.mp4']) {
    assert.equal(videoSchema.safeParse(withAsset(path)).success, false);
  }
  assert.equal(videoSchema.safeParse({scenes: [{...scene, durationInFrames: 0}]}).success, false);
  assert.equal(videoSchema.safeParse({scenes: []}).success, false);
});
