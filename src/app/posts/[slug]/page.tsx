import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { MDXContent } from '@/components/mdx-content'
import { formatDate } from '@/lib/format'
import { site } from '@/lib/site'

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const url = `${site.url}${post.permalink}`
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <article>
      <header className="border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden>·</span>
          <span>{post.metadata.readingTime}분 읽기</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{post.title}</h1>
        <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400">{post.description}</p>
        {post.tags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-pre:bg-neutral-100 dark:prose-pre:bg-neutral-900 prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800">
        <MDXContent code={post.content} />
      </div>

      <div className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Link href="/" className="text-sm text-emerald-600 hover:underline dark:text-emerald-400">
          ← 목록으로
        </Link>
      </div>
    </article>
  )
}
