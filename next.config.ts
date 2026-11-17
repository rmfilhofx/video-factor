import type {NextConfig} from 'next';
import {videos} from './web/catalog';

const config: NextConfig = {
  async headers() {
    return videos.map(({file}) => ({
      source: `/videos/${file}`,
      has: [{type: 'query', key: 'download', value: '1'}],
      headers: [{key: 'Content-Disposition', value: `attachment; filename="${file}"`}],
    }));
  },
};

export default config;
