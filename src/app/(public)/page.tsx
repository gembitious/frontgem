import { getAllPosts } from '@/lib/posts'
import { PostCard } from '@/components/post-card'

export default function HomePage() {
  const posts = getAllPosts()

  return (
    <div>
      <section className="border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="text-2xl font-bold tracking-tight">frontgem</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          초안(원석)을 깎아 발행(보석)한다. 프런트엔드와 AI 퇴고 파이프라인에 대한 기록.
        </p>
      </section>

      {posts.length === 0 ? (
        <p className="py-12 text-center text-neutral-500">아직 발행된 글이 없습니다.</p>
      ) : (
        <div className="mt-2">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
