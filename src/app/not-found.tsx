import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400">404</p>
      <h1 className="mt-4 text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-neutral-500">주소가 바뀌었거나 삭제된 글일 수 있습니다.</p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-emerald-600 hover:underline dark:text-emerald-400"
      >
        ← 홈으로
      </Link>
    </main>
  )
}
