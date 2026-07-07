import { defineConfig, defineCollection, s } from 'velite'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import remarkGfm from 'remark-gfm'
import rehypeShiki from '@shikijs/rehype'

// Single source of truth for a published post. Zod schema = compile-time and
// runtime validation; a malformed frontmatter fails the build instead of
// shipping a broken page. The block model (Phase 3) will consume the same MDX.
const posts = defineCollection({
  name: 'Post',
  pattern: 'posts/**/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      description: s.string().max(300),
      date: s.isodate(),
      updated: s.isodate().optional(),
      tags: s.array(s.string()).default([]),
      draft: s.boolean().default(false),
      cover: s.image().optional(),
      // metadata() → { readingTime, wordCount }; excerpt() → plain-text preview.
      metadata: s.metadata(),
      excerpt: s.excerpt({ length: 200 }),
      toc: s.toc(),
      // mdx() compiles to a function-body string evaluated by the MDX renderer.
      content: s.mdx(),
      // path() = file path relative to content root, sans extension (e.g. "posts/hello").
      path: s.path(),
    })
    .transform((data) => {
      const slug = data.path.replace(/^posts\//, '')
      return { ...data, slug, permalink: `/posts/${slug}` }
    }),
})

export default defineConfig({
  root: 'content',
  collections: { posts },
  mdx: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      // Dual-theme highlighting: light colors inline, dark via CSS vars overridden
      // under html.dark (see globals.css). No client JS, works with SSG.
      [rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }],
      [rehypeAutolinkHeadings, { behavior: 'wrap', properties: { className: ['heading-anchor'] } }],
    ],
  },
})
