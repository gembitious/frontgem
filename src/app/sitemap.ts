import type { MetadataRoute } from 'next'
import { getAllPosts, getAllTags } from '@/lib/posts'
import { site } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()

  const postEntries: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${site.url}${post.permalink}`,
    lastModified: post.updated ?? post.date,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const tagEntries: MetadataRoute.Sitemap = getAllTags().map(({ tag }) => ({
    url: `${site.url}/tags/${encodeURIComponent(tag)}`,
    changeFrequency: 'weekly',
    priority: 0.4,
  }))

  return [
    { url: site.url, changeFrequency: 'daily', priority: 1 },
    { url: `${site.url}/tags`, changeFrequency: 'weekly', priority: 0.5 },
    ...postEntries,
    ...tagEntries,
  ]
}
