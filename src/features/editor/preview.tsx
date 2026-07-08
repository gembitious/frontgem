'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MDXClient } from 'next-mdx-remote-client'
import type { ComponentPropsWithoutRef } from 'react'

type PreviewResult = {
  compiledSource: string
  frontmatter: Record<string, unknown>
  scope: Record<string, unknown>
}

type PreviewState = {
  result: PreviewResult | null
  error: string | null
  loading: boolean
}

function Anchor({ href = '', ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/')) return <Link href={href} {...props} />
  return <a href={href} target="_blank" rel="noreferrer noopener" {...props} />
}

const components = { a: Anchor }

// Debounced server render of the markdown body via /api/preview.
function usePreview(body: string): PreviewState {
  const [state, setState] = useState<PreviewState>({ result: null, error: null, loading: false })
  const reqId = useRef(0)

  useEffect(() => {
    const id = ++reqId.current
    const timer = setTimeout(async () => {
      if (!body.trim()) {
        setState({ result: null, error: null, loading: false })
        return
      }
      setState((s) => ({ ...s, loading: true }))
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        })
        if (id !== reqId.current) return // stale
        if (res.status === 401) {
          setState({ result: null, error: '세션이 만료되었습니다. 다시 로그인하세요.', loading: false })
          return
        }
        const data = (await res.json()) as Partial<PreviewResult> & { error?: string }
        if (data.error || !data.compiledSource) {
          setState({ result: null, error: data.error ?? '프리뷰를 만들 수 없습니다.', loading: false })
          return
        }
        setState({
          result: {
            compiledSource: data.compiledSource,
            frontmatter: data.frontmatter ?? {},
            scope: data.scope ?? {},
          },
          error: null,
          loading: false,
        })
      } catch {
        if (id === reqId.current) {
          setState({ result: null, error: '네트워크 오류가 발생했습니다.', loading: false })
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [body])

  return state
}

export function Preview({ body }: { body: string }) {
  const { result, error, loading } = usePreview(body)

  return (
    <div className="relative">
      {loading && (
        <span className="absolute right-0 top-0 text-xs text-neutral-400">렌더링 중…</span>
      )}
      {error ? (
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </pre>
      ) : result ? (
        <div className="prose prose-neutral max-w-none dark:prose-invert prose-pre:border prose-pre:border-neutral-200 dark:prose-pre:border-neutral-800">
          <MDXClient {...result} components={components} />
        </div>
      ) : (
        <p className="text-sm text-neutral-400">본문을 입력하면 여기에 미리보기가 표시됩니다.</p>
      )}
    </div>
  )
}
