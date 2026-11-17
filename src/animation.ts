import {Easing, interpolate} from 'remotion';
import type {SceneSpec} from './spec';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export function reveal(frame: number, index: number, style: SceneSpec['animation'], duration: number) {
  const length = Math.min(22, Math.floor(duration * 0.52));
  const offset = index * Math.min(3, Math.floor(duration * 0.1));
  const progress = interpolate(frame - offset, [0, length], [0, 1], {
    ...clamp, easing: Easing.out(Easing.cubic),
  });
  const remaining = 1 - progress;
  const x = style === 'slide' ? 120 * remaining : 0;
  const y = style === 'rise' ? 85 * remaining : 0;
  const scale = style === 'impact' ? 1 + 0.22 * remaining : 1;
  return {opacity: progress, transform: `translate(${x}px,${y}px) scale(${scale})`};
}

export function sceneMotion(frame: number, duration: number, index: number, last: boolean) {
  const drift = frame / Math.max(1, duration - 1);
  const edge = Math.min(12, Math.floor(duration / 4));
  return {
    zoom: 1.03 + 0.14 * (index % 2 === 0 ? drift : 1 - drift),
    flash: index ? interpolate(frame, [0, edge], [0.76, 0], {...clamp, easing: Easing.out(Easing.quad)}) : 0,
    swipe: interpolate(frame, [duration - edge, duration - 1], [0, 1], {...clamp, easing: Easing.in(Easing.quad)}),
    end: last ? interpolate(frame, [duration - edge, duration - 1], [0, 0.9], clamp) : 0,
  };
}
