import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://gamultong.github.io/gamulpung-client/',
      changeFrequency: 'daily',
      priority: 1,
      lastModified: new Date().toISOString(),
      images: ['/gamulpung-client/icon.png'],
    },
  ];
}
