import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  experimental: {},
  trailingSlash: true, // 슬래시로 끝나게 설정
  distDir: 'out',
};

export default nextConfig;
