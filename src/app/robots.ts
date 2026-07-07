import type { MetadataRoute } from 'next'
import { site } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Admin write route lands here in Phase 2 — keep it out of the index.
      disallow: '/write',
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  }
}
