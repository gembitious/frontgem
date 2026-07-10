'use client'

import { useEffect, useState } from 'react'
import { useLapidaryStore } from './store'
import { useLapidaryPrefs } from './prefs'
import { MODELS, providerFor, type Provider } from './models'
import { mergeHunks, pendingCount } from './diff'
import { PRESETS } from './presets'
import { HunkRow } from './hunk-view'

type ProviderStatus = { configured: boolean; ok: boolean; reason?: 'missing' | 'invalid' | 'error' }
type LapidaryStatus = Record<Provider, ProviderStatus>

const KEY_ENV: Record<Provider, string> = {
  claude: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
  mock: '',
}

// Short availability note for an option label (based on the token-free status check).
function unavailableSuffix(s: ProviderStatus | undefined): string {
  if (!s || s.ok) return ''
  return s.reason === 'missing' ? ' · 키 없음' : ' · 키 오류'
}

// Drives the streaming rewrite. Uses getState() because it runs across many
// awaits; the store actions are stable.
async function runRevise() {
  const store = useLapidaryStore.getState()
  const { original, presets, instruction } = store
  const model = useLapidaryPrefs.getState().model
  store.startRevising()

  try {
    const res = await fetch('/api/revise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: original, presets, instruction, model }),
    })
    if (res.status === 401) return store.failRevising('세션이 만료되었습니다. 다시 로그인하세요.')
    if (!res.ok || !res.body) return store.failRevising('퇴고 요청에 실패했습니다.')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() ?? ''
      for (const chunk of chunks) {
        const line = chunk.trim()
        if (!line.startsWith('data:')) continue
        const data = JSON.parse(line.slice(5).trim()) as {
          text?: string
          error?: string
          done?: boolean
        }
        if (data.error) return store.failRevising(data.error)
        if (data.text) useLapidaryStore.getState().appendRevised(data.text)
      }
    }
    useLapidaryStore.getState().finishRevising()
  } catch {
    useLapidaryStore.getState().failRevising('네트워크 오류가 발생했습니다.')
  }
}

function OptionsPhase() {
  const presets = useLapidaryStore((s) => s.presets)
  const instruction = useLapidaryStore((s) => s.instruction)
  const error = useLapidaryStore((s) => s.error)
  const togglePreset = useLapidaryStore((s) => s.togglePreset)
  const setInstruction = useLapidaryStore((s) => s.setInstruction)
  const model = useLapidaryPrefs((s) => s.model)
  const setModel = useLapidaryPrefs((s) => s.setModel)
  const selectedModel = MODELS.find((m) => m.id === model)
  const modelHint = selectedModel?.hint
  const modelWarn = selectedModel && 'warn' in selectedModel ? selectedModel.warn : undefined

  // Token-free provider status, fetched when the panel opens.
  const [status, setStatus] = useState<LapidaryStatus | null>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/lapidary/status')
      .then((r) => (r.ok ? (r.json() as Promise<LapidaryStatus>) : null))
      .then((s) => {
        if (alive && s) setStatus(s)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const provider = providerFor(model)
  const providerStatus = status?.[provider]
  const unavailable = providerStatus ? !providerStatus.ok : false
  const availabilityMsg = !unavailable
    ? null
    : providerStatus?.reason === 'missing'
      ? `이 모델을 쓰려면 서버에 ${KEY_ENV[provider]} 를 설정해야 합니다.`
      : providerStatus?.reason === 'invalid'
        ? 'API 키 인증에 실패했습니다. 키를 확인하세요.'
        : '상태 확인에 실패했습니다.'

  return (
    <div>
      <p className="text-sm font-medium">수정 방향</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = presets.includes(p.id)
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => togglePreset(p.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-700 dark:text-neutral-400'
                }`}
              >
                {p.label}
              </button>
            </li>
          )
        })}
      </ul>

      <label htmlFor="lapidary-instruction" className="mt-5 block text-sm font-medium">
        자유 지시 (선택)
      </label>
      <textarea
        id="lapidary-instruction"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        placeholder="예: 도입부를 더 강하게, 예시를 하나 추가"
        className="mt-1.5 w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900"
      />

      <div className="mt-5 flex items-center gap-2">
        <label htmlFor="lapidary-model" className="text-sm font-medium">
          모델
        </label>
        <select
          id="lapidary-model"
          value={model}
          onChange={(e) => setModel(e.target.value as typeof model)}
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {unavailableSuffix(status?.[m.provider])}
            </option>
          ))}
        </select>
        {modelHint && <span className="text-xs text-neutral-400">{modelHint}</span>}
      </div>
      {modelWarn && !unavailable && (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          ⚠ {modelWarn}
        </p>
      )}
      {availabilityMsg && (
        <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
          ⚠ {availabilityMsg}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="button"
        onClick={runRevise}
        disabled={unavailable}
        className="mt-5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        퇴고 시작
      </button>
    </div>
  )
}

function RevisingPhase() {
  const revised = useLapidaryStore((s) => s.revised)
  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
        lapidary가 퇴고 중…
      </p>
      <pre className="mt-3 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-4 font-mono text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
        {revised || '…'}
      </pre>
    </div>
  )
}

function DiffPhase({ onApply }: { onApply: (merged: string) => void }) {
  const hunks = useLapidaryStore((s) => s.hunks)
  const display = useLapidaryStore((s) => s.display)
  const setDisplay = useLapidaryStore((s) => s.setDisplay)
  const acceptAll = useLapidaryStore((s) => s.acceptAll)
  const rejectAll = useLapidaryStore((s) => s.rejectAll)
  const close = useLapidaryStore((s) => s.close)

  const changed = hunks.filter((h) => h.kind !== 'equal').length
  const pending = pendingCount(hunks)

  if (changed === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">
        <p>제안된 변경이 없습니다. 원문이 그대로 유지됩니다.</p>
        <button
          type="button"
          onClick={close}
          className="mt-4 rounded-md bg-neutral-200 px-4 py-2 text-sm dark:bg-neutral-800"
        >
          닫기
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">
          변경 {changed}건 · 미결정 {pending}건
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-300 text-xs dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setDisplay('unified')}
              className={`rounded-l-md px-2.5 py-1 ${display === 'unified' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}
            >
              통합
            </button>
            <button
              type="button"
              onClick={() => setDisplay('split')}
              className={`rounded-r-md px-2.5 py-1 ${display === 'split' ? 'bg-neutral-200 dark:bg-neutral-800' : ''}`}
            >
              좌우
            </button>
          </div>
          <button type="button" onClick={acceptAll} className="rounded-md px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
            모두 수락
          </button>
          <button type="button" onClick={rejectAll} className="rounded-md px-2.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            모두 거부
          </button>
        </div>
      </div>

      <div className="mt-4 flex max-h-[50vh] flex-col gap-2 overflow-auto pr-1">
        {hunks.map((h) => (
          <HunkRow key={h.id} hunk={h} display={display} />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={close}
          className="rounded-md px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onApply(mergeHunks(useLapidaryStore.getState().hunks))}
          className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          에디터에 적용
        </button>
      </div>
    </div>
  )
}

export function Lapidary({ onApply }: { onApply: (merged: string) => void }) {
  const open = useLapidaryStore((s) => s.open)
  const phase = useLapidaryStore((s) => s.phase)
  const close = useLapidaryStore((s) => s.close)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-3xl rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            lapidary <span className="text-sm font-normal text-neutral-400">퇴고</span>
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {phase === 'options' && <OptionsPhase />}
        {phase === 'revising' && <RevisingPhase />}
        {phase === 'diff' && <DiffPhase onApply={onApply} />}
      </div>
    </div>
  )
}
