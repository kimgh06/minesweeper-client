import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  sassOptions: {
    silenceDeprecations: ['legacy-js-api'],
  },
  output: 'export',
  basePath: './minesweeper-client', // GitHub Pages에서 사용하는 경로로 설정
  assetPrefix: './minesweeper-client/', // GitHub Pages에서 사용하는 경로로 설정
  trailingSlash: true, // 슬래시로 끝나게 설정
};

export default nextConfig;
