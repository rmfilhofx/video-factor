import type {NextConfig} from 'next';
import {videos} from './web/catalog';

const config: NextConfig = {
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/clips/render': ['./node_modules/@ffmpeg-installer/linux-x64/ffmpeg', './server/fonts/DejaVuSans-Bold.ttf'],
    '/api/gerar': ['./node_modules/@ffmpeg-installer/linux-x64/ffmpeg', './server/fonts/DejaVuSans-Bold.ttf', './server/media/lake-mead.jpg'],
  },
  async headers() {
    return videos.map(({file}) => ({
      source: `/videos/${file}`,
      has: [{type: 'query', key: 'download', value: '1'}],
      headers: [{key: 'Content-Disposition', value: `attachment; filename="${file}"`}],
    }));
  },
};

export default config;
