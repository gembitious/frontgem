'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditorStore, useHydrated, parseTags } from './store'
import { Preview } from './preview'
import { WysiwygEditor } from './wysiwyg/wysiwyg-editor'
import { Lapidary } from '@/features/lapidary/lapidary'
import { useLapidaryStore } from '@/features/lapidary/store'
import { useRoundsStore } from '@/features/lapidary/rounds'
import { RoundHistory } from '@/features/lapidary/round-history'
import { validateDraft, slugify } from '@/entities/document/frontmatter'

type EditMode = 'markdown' | 'wysiwyg'

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

type PublishState =
  | { kind: 'idle' }
  | { kind: 'publishing' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; slug: string; updated: boolean; commitUrl: string }

const inputClass =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-900'

export function Editor() {
  const router = useRouter()
  const hydrated = useHydrated()

  const title = useEditorStore((s) => s.title)
  const description = useEditorStore((s) => s.description)
  const slug = useEditorStore((s) => s.slug)
  const date = useEditorStore((s) => s.date)
  const tags = useEditorStore((s) => s.tags)
  const draft = useEditorStore((s) => s.draft)
  const body = useEditorStore((s) => s.body)
  const set = useEditorStore((s) => s.set)
  const reset = useEditorStore((s) => s.reset)

  const beginLapidary = useLapidaryStore((s) => s.begin)
  const closeLapidary = useLapidaryStore((s) => s.close)

  const [publish, setPublish] = useState<PublishState>({ kind: 'idle' })
  const [mode, setMode] = useState<EditMode>('markdown')
  const [historyOpen, setHistoryOpen] = useState(false)
  const roundCount = useRoundsStore((s) => s.rounds.length)

  // Default the date to today once, after hydration.
  useEffect(() => {
    if (hydrated && !date) set('date', todayISO())
  }, [hydrated, date, set])

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  async function onPublish() {
    const payload = {
      title,
      description,
      slug,
      date: date || todayISO(),
      tags: parseTags(tags),
      draft,
      body,
    }

    const errors = validateDraft(payload)
    if (errors.length > 0) {
      setPublish({ kind: 'error', message: errors.join('\n') })
      return
    }

    setPublish({ kind: 'publishing' })
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        router.replace('/login?from=/write')
        return
      }
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        slug?: string
        updated?: boolean
        commitUrl?: string
      }
      if (!res.ok || !data.ok) {
        setPublish({ kind: 'error', message: data.error ?? '발행에 실패했습니다.' })
        return
      }
      setPublish({
        kind: 'success',
        slug: data.slug ?? slug,
        updated: Boolean(data.updated),
        commitUrl: data.commitUrl ?? '#',
      })
    } catch {
      setPublish({ kind: 'error', message: '네트워크 오류가 발생했습니다.' })
    }
  }

  if (!hydrated) {
    return <p className="py-16 text-center text-neutral-400">에디터를 불러오는 중…</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">글쓰기</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              if (confirm('현재 초안을 비웁니다. 계속할까요?')) {
                reset()
                setPublish({ kind: 'idle' })
              }
            }}
            className="rounded-md px-3 py-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            초안 비우기
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md px-3 py-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            로그아웃
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        초안은 브라우저에 자동 저장됩니다. 발행하면 <code>content/posts/</code>에 커밋되어 배포가 시작됩니다.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        {/* Left: form + body */}
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              제목
            </label>
            <input
              id="title"
              value={title}
              maxLength={120}
              onChange={(e) => set('title', e.target.value)}
              className={`mt-1.5 ${inputClass}`}
              placeholder="글 제목"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="slug" className="block text-sm font-medium">
                슬러그
              </label>
              <button
                type="button"
                onClick={() => {
                  const s = slugify(title)
                  if (s) set('slug', s)
                }}
                className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
              >
                제목에서 생성
              </button>
            </div>
            <input
              id="slug"
              value={slug}
              onChange={(e) => set('slug', e.target.value)}
              className={`mt-1.5 font-mono ${inputClass}`}
              placeholder="hello-world"
            />
            <p className="mt-1 text-xs text-neutral-400">
              URL: /posts/{slug || '…'} · 영소문자·숫자·하이픈만
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                날짜
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => set('date', e.target.value)}
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="tags" className="block text-sm font-medium">
                태그
              </label>
              <input
                id="tags"
                value={tags}
                onChange={(e) => set('tags', e.target.value)}
                className={`mt-1.5 ${inputClass}`}
                placeholder="쉼표로 구분"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              요약
            </label>
            <textarea
              id="description"
              value={description}
              maxLength={300}
              rows={2}
              onChange={(e) => set('description', e.target.value)}
              className={`mt-1.5 resize-none ${inputClass}`}
              placeholder="목록·OG·RSS에 쓰이는 한두 문장 요약"
            />
            <p className="mt-1 text-right text-xs text-neutral-400">{description.length}/300</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft}
              onChange={(e) => set('draft', e.target.checked)}
              className="size-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
            />
            초안으로 표시 (프로덕션 목록에서 숨김)
          </label>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between">
              <label htmlFor="body" className="block text-sm font-medium">
                본문
              </label>
              <div className="flex rounded-md border border-neutral-300 text-xs dark:border-neutral-700">
                <button
                  type="button"
                  onClick={() => setMode('markdown')}
                  className={`rounded-l-md px-2.5 py-1 ${mode === 'markdown' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}
                >
                  마크다운
                </button>
                <button
                  type="button"
                  onClick={() => setMode('wysiwyg')}
                  className={`rounded-r-md px-2.5 py-1 ${mode === 'wysiwyg' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}
                >
                  에디터
                </button>
              </div>
            </div>
            {mode === 'markdown' ? (
              <textarea
                id="body"
                value={body}
                onChange={(e) => set('body', e.target.value)}
                className={`mt-1.5 min-h-[24rem] flex-1 font-mono text-sm leading-relaxed ${inputClass}`}
                placeholder={'## 소제목\n\n문단을 작성하세요.'}
                spellCheck={false}
              />
            ) : (
              <div className="mt-1.5 min-h-[24rem] flex-1 rounded-md border border-neutral-300 p-3 text-sm leading-relaxed dark:border-neutral-700">
                {/* key by mount: re-parses current body when switching in */}
                <WysiwygEditor initialMarkdown={body} onChange={(md) => set('body', md)} />
              </div>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 text-sm font-medium text-neutral-500">미리보기</div>
          <div className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
            <Preview body={body} />
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => beginLapidary(body)}
          disabled={!body.trim()}
          className="rounded-md border border-emerald-600 px-5 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
        >
          lapidary 퇴고
        </button>
        {roundCount > 0 && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="rounded-md px-3 py-2.5 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            라운드 기록 ({roundCount})
          </button>
        )}
        <button
          type="button"
          onClick={onPublish}
          disabled={publish.kind === 'publishing'}
          className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publish.kind === 'publishing' ? '발행 중…' : '발행'}
        </button>

        {publish.kind === 'error' && (
          <pre className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
            {publish.message}
          </pre>
        )}
        {publish.kind === 'success' && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            {publish.updated ? '수정' : '발행'} 완료 — <code>{publish.slug}</code>.{' '}
            <a href={publish.commitUrl} target="_blank" rel="noreferrer noopener" className="underline">
              커밋 보기
            </a>
            . 배포가 반영되기까지 잠시 걸립니다.
          </p>
        )}
      </div>

      {/* AI 퇴고 엔진: 머지 결과를 본문에 반영 (라운드 반복 가능) */}
      <Lapidary
        onApply={(merged) => {
          const { original, presets, instruction } = useLapidaryStore.getState()
          useRoundsStore.getState().add({ before: original, after: merged, presets, instruction })
          set('body', merged)
          closeLapidary()
        }}
      />

      <RoundHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRevert={(md) => set('body', md)}
      />
    </div>
  )
}
