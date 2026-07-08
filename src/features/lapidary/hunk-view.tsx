'use client'

import { useState } from 'react'
import type { Hunk, WordPart } from './diff'
import { useLapidaryStore, type DiffDisplay } from './store'

const DEL = 'bg-red-100 text-red-800 line-through decoration-red-400 dark:bg-red-950/60 dark:text-red-300'
const INS = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'

// Inline (unified) word diff: shared 어절 plain, deletions struck red, insertions green.
function WordDiffInline({ words }: { words: readonly WordPart[] }) {
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {words.map((w, i) =>
        w.type === 'equal' ? (
          <span key={i}>{w.text}</span>
        ) : (
          <span key={i} className={`rounded px-0.5 ${w.type === 'delete' ? DEL : INS}`}>
            {w.text}
          </span>
        ),
      )}
    </p>
  )
}

// One side of a split view: 'original' keeps equal+delete, 'revised' keeps equal+insert.
function SideText({ words, side }: { words: readonly WordPart[]; side: 'original' | 'revised' }) {
  const drop = side === 'original' ? 'insert' : 'delete'
  const mark = side === 'original' ? DEL : INS
  return (
    <p className="whitespace-pre-wrap break-words leading-relaxed">
      {words
        .filter((w) => w.type !== drop)
        .map((w, i) =>
          w.type === 'equal' ? (
            <span key={i}>{w.text}</span>
          ) : (
            <span key={i} className={`rounded px-0.5 ${mark}`}>
              {w.text}
            </span>
          ),
        )}
    </p>
  )
}

// A whole-block insert/delete has no word diff; render the block text tinted.
function WholeBlock({ text, tone }: { text: string; tone: 'del' | 'ins' }) {
  return (
    <p className={`whitespace-pre-wrap break-words rounded px-1 leading-relaxed ${tone === 'del' ? DEL : INS}`}>
      {text}
    </p>
  )
}

function StatusBadge({ hunk }: { hunk: Hunk }) {
  if (hunk.status === 'accepted') return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">수락됨</span>
  if (hunk.status === 'rejected') return <span className="text-xs font-medium text-neutral-400">거부됨</span>
  if (hunk.status === 'edited') return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">직접수정</span>
  return null
}

function DiffBody({ hunk, display }: { hunk: Hunk; display: DiffDisplay }) {
  if (hunk.kind === 'change' && hunk.words) {
    if (display === 'split') {
      return (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <SideText words={hunk.words} side="original" />
          <SideText words={hunk.words} side="revised" />
        </div>
      )
    }
    return (
      <div className="text-sm">
        <WordDiffInline words={hunk.words} />
      </div>
    )
  }
  if (hunk.kind === 'insert') {
    return display === 'split' ? (
      <div className="grid grid-cols-2 gap-3 text-sm">
        <span className="text-neutral-300 dark:text-neutral-600">—</span>
        <WholeBlock text={hunk.revised} tone="ins" />
      </div>
    ) : (
      <div className="text-sm">
        <WholeBlock text={hunk.revised} tone="ins" />
      </div>
    )
  }
  // delete
  return display === 'split' ? (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <WholeBlock text={hunk.original} tone="del" />
      <span className="text-neutral-300 dark:text-neutral-600">—</span>
    </div>
  ) : (
    <div className="text-sm">
      <WholeBlock text={hunk.original} tone="del" />
    </div>
  )
}

const actionBtn =
  'rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40'

export function HunkRow({ hunk, display }: { hunk: Hunk; display: DiffDisplay }) {
  const setStatus = useLapidaryStore((s) => s.setStatus)
  const setEdited = useLapidaryStore((s) => s.setEdited)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // Equal blocks are context — render muted, no controls.
  if (hunk.kind === 'equal') {
    return (
      <div className="border-l-2 border-neutral-200 py-1.5 pl-3 text-sm text-neutral-400 dark:border-neutral-800">
        <p className="line-clamp-2 whitespace-pre-wrap break-words">{hunk.original}</p>
      </div>
    )
  }

  const startEdit = () => {
    setDraft(hunk.edited ?? (hunk.kind === 'delete' ? hunk.original : hunk.revised))
    setEditing(true)
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(2, draft.split('\n').length)}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 font-mono text-sm outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900"
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEdited(hunk.id, draft)
                setEditing(false)
              }}
              className={`${actionBtn} bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`${actionBtn} text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800`}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <>
          <DiffBody hunk={hunk} display={display} />
          {hunk.status === 'edited' && hunk.edited && (
            <p className="mt-2 whitespace-pre-wrap break-words rounded bg-amber-50 px-2 py-1 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {hunk.edited}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {hunk.status === 'pending' ? (
              <>
                <button
                  type="button"
                  onClick={() => setStatus(hunk.id, 'accepted')}
                  className={`${actionBtn} bg-emerald-600 text-white hover:bg-emerald-700`}
                >
                  수락
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(hunk.id, 'rejected')}
                  className={`${actionBtn} bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700`}
                >
                  거부
                </button>
                <button
                  type="button"
                  onClick={startEdit}
                  className={`${actionBtn} text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40`}
                >
                  직접수정
                </button>
              </>
            ) : (
              <>
                <StatusBadge hunk={hunk} />
                <button
                  type="button"
                  onClick={startEdit}
                  className={`${actionBtn} text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200`}
                >
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => setStatus(hunk.id, 'pending')}
                  className={`${actionBtn} text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200`}
                >
                  되돌리기
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
