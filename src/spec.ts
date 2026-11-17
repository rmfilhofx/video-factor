import {z} from 'zod';

const assetPath = z.string().regex(
  /^(?:[\p{L}\p{N}_ -]+\/)*[\p{L}\p{N}_ -][\p{L}\p{N}_. -]*$/u,
  'Use um caminho relativo a public/, sem URL ou segmentos ..',
);

const sceneSchema = z.object({
  lines: z.array(z.string().trim().min(1).max(80)).min(1).max(5),
  durationInFrames: z.number().int().min(15),
  animation: z.enum(['rise', 'impact', 'slide', 'fade']),
  palette: z.enum(['dusk', 'heat', 'violet', 'signal']),
  eyebrow: z.string().max(60).optional(),
  media: z.object({kind: z.enum(['image', 'video']), src: assetPath}).optional(),
});

export const videoSchema = z.object({
  scenes: z.array(sceneSchema).min(1),
  branding: z.object({name: z.string().max(28), label: z.string().max(24)}).optional(),
  audio: z.object({
    cue: assetPath.optional(),
    bed: assetPath.optional(),
    volume: z.number().min(0).max(1),
  }).optional(),
});

export type VideoSpec = z.infer<typeof videoSchema>;
export type SceneSpec = VideoSpec['scenes'][number];
export const format = {width: 1080, height: 1920, fps: 30} as const;

export function buildTimeline(scenes: VideoSpec['scenes']) {
  let from = 0;
  return scenes.map((scene, index) => {
    const entry = {scene, from, index};
    from += scene.durationInFrames;
    return entry;
  });
}

export function durationOf(scenes: VideoSpec['scenes']) {
  return scenes.reduce((sum, scene) => sum + scene.durationInFrames, 0);
}
