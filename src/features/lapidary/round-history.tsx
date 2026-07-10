'use client'

import { useRoundsStore } from './rounds'
import { PRESETS } from './presets'

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function labelsFor(ids: readonly string[]): string {
  const labels = PRESETS.filter((p) => ids.includes(p.id)).map((p) => p.label)
  return labels.length > 0 ? labels.join(' · ') : '기본'
}

export function RoundHistory({
  open,
  onClose,
  onRevert,
}: {
  open: boolean
  onClose: () => void
  onRevert: (markdown: string) => void
}) {
  const rounds = useRoundsStore((s) => s.rounds)
  const clear = useRoundsStore((s) => s.clear)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            퇴고 라운드 기록 <span className="text-sm font-normal text-neutral-400">{rounds.length}</span>
          </h2>
          <div className="flex items-center gap-2">
            {rounds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('라운드 기록을 모두 지웁니다.')) clear()
                }}
                className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                기록 비우기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>
        </div>

        {rounds.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">아직 적용한 퇴고 라운드가 없습니다.</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-3 overflow-auto">
            {rounds.map((r) => (
              <li key={r.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{labelsFor(r.presets)}</p>
                    <p className="text-xs text-neutral-500">
                      {timeFmt.format(new Date(r.at))} · {r.before.length}자 → {r.after.length}자
                    </p>
                    {r.instruction.trim() && (
                      <p className="mt-1 truncate text-xs text-neutral-400">“{r.instruction.trim()}”</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('이 라운드 적용 이전 상태로 본문을 되돌립니다. 계속할까요?')) {
                        onRevert(r.before)
                        onClose()
                      }
                    }}
                    className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    이전으로 되돌리기
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
