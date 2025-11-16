import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://tategaki.jp'
  const now = new Date()
  const staticPaths = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/legal', changeFrequency: 'monthly', priority: 0.6 },
  ] as const

  return staticPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
