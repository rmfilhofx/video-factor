import type {NextConfig} from 'next';
import {videos} from './web/catalog';

const config: NextConfig = {
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/gerar': ['./node_modules/@ffmpeg-installer/linux-x64/ffmpeg', './server/fonts/DejaVuSans-Bold.ttf'],
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
