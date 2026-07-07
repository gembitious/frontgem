import { Feed } from 'feed'
import { getAllPosts } from '@/lib/posts'
import { site } from '@/lib/site'

// Static RSS: regenerated on each build (and Phase 2 on-demand revalidation).
export const dynamic = 'force-static'

export function GET(): Response {
  const feed = new Feed({
    title: site.title,
    description: site.description,
    id: site.url,
    link: site.url,
    language: 'ko',
    copyright: `© ${site.author.name}`,
    feedLinks: { rss2: `${site.url}/rss.xml` },
    author: { name: site.author.name, link: site.author.github },
  })

  for (const post of getAllPosts()) {
    const url = `${site.url}${post.permalink}`
    feed.addItem({
      title: post.title,
      id: url,
      link: url,
      description: post.description,
      date: new Date(post.date),
      category: post.tags.map((name) => ({ name })),
    })
  }

  return new Response(feed.rss2(), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
