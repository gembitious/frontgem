import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllTags } from '@/lib/posts'

export const metadata: Metadata = {
  title: '태그',
  description: '태그별로 글을 모아봅니다.',
}

export default function TagsPage() {
  const tags = getAllTags()

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">태그</h1>
      {tags.length === 0 ? (
        <p className="mt-8 text-neutral-500">아직 태그가 없습니다.</p>
      ) : (
        <ul className="mt-6 flex flex-wrap gap-3">
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                href={`/tags/${encodeURIComponent(tag)}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {tag}
                <span className="text-neutral-400">{count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
