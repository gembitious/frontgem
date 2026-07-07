import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAllTags, getPostsByTag } from '@/lib/posts'
import { PostCard } from '@/components/post-card'

type Params = { tag: string }

export function generateStaticParams(): Params[] {
  return getAllTags().map(({ tag }) => ({ tag: encodeURIComponent(tag) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  return {
    title: `#${decoded}`,
    description: `"${decoded}" 태그가 달린 글 모음.`,
  }
}

export default async function TagPage({ params }: { params: Promise<Params> }) {
  const { tag } = await params
  const decoded = decodeURIComponent(tag)
  const posts = getPostsByTag(decoded)

  if (posts.length === 0) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        <span className="text-emerald-600 dark:text-emerald-400">#</span>
        {decoded}
      </h1>
      <p className="mt-2 text-neutral-500">{posts.length}개의 글</p>
      <div className="mt-4">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </div>
  )
}
