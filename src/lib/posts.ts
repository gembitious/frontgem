import { posts, type Post } from '#site/content'

export type { Post }

// In dev we want to preview drafts; in production they are hidden.
const includeDrafts = process.env.NODE_ENV !== 'production'

/** All visible posts, newest first. */
export function getAllPosts(): Post[] {
  return posts
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((post) => post.slug === slug)
}

/** Tag → post count, sorted by frequency then name. */
export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const post of getAllPosts()) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) => post.tags.includes(tag))
}
