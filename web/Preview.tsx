'use client';

import {Player} from '@remotion/player';
import preset from '../presets/gta6-promo.json';
import {Video} from '../src/Video';
import {durationOf, format, videoSchema} from '../src/spec';

const video = videoSchema.parse(preset);

export default function Preview() {
  return (
    <Player
      component={Video}
      inputProps={{video}}
      compositionWidth={format.width}
      compositionHeight={format.height}
      fps={format.fps}
      durationInFrames={durationOf(video.scenes)}
      style={{width: '100%', height: '100%'}}
      controls
      clickToPlay
    />
  );
}
