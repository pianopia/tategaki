import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'tategaki - 縦書きエディタ',
    short_name: 'tategaki',
    description: '縦書き表示とAI執筆支援機能を搭載した無料の小説エディタ',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4F46E5',
    icons: [
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
    categories: ['productivity', 'writing', 'education'],
    lang: 'ja',
    orientation: 'portrait',
  }
}
