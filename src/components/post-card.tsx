import Link from 'next/link'
import type { Post } from '@/lib/posts'
import { formatDate } from '@/lib/format'

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="group border-b border-neutral-200 py-6 last:border-0 dark:border-neutral-800">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span aria-hidden>·</span>
        <span>{post.metadata.readingTime}분 읽기</span>
        {post.draft && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            초안
          </span>
        )}
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        <Link href={post.permalink} className="hover:text-emerald-600 dark:hover:text-emerald-400">
          {post.title}
        </Link>
      </h2>
      <p className="mt-1.5 text-neutral-600 dark:text-neutral-400">{post.description}</p>
      {post.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
