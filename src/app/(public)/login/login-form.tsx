'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LoginForm({ from }: { from: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? '로그인에 실패했습니다.')
        return
      }
      // Full navigation so middleware re-evaluates with the new cookie.
      router.replace(from)
      router.refresh()
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-sm">
      <h1 className="text-2xl font-bold tracking-tight">어드민 로그인</h1>
      <p className="mt-2 text-sm text-neutral-500">글을 쓰고 발행하려면 로그인하세요.</p>

      <label htmlFor="password" className="mt-8 block text-sm font-medium">
        비밀번호
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900"
      />

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="mt-6 w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? '확인 중…' : '로그인'}
      </button>
    </form>
  )
}
