import {z} from 'zod';
import {Composition} from 'remotion';
import preset from '../presets/gta6-promo.json';
import {durationOf, format, videoSchema} from './spec';
import {Video} from './Video';

const defaultProps = {video: videoSchema.parse(preset)};
const schema = z.object({video: videoSchema});

export function Root() {
  return (
    <Composition
      id="GTA6Promo"
      component={Video}
      schema={schema}
      defaultProps={defaultProps}
      durationInFrames={durationOf(defaultProps.video.scenes)}
      calculateMetadata={({props}) => ({durationInFrames: durationOf(props.video.scenes)})}
      {...format}
    />
  );
}
