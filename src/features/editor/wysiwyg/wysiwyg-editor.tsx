'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { htmlInlineToMd } from '@/entities/document/inline'
import { EditableBlock, type EditableTag } from './editable-block'
import {
  parseDocument,
  serializeDocument,
  newId,
  type EditorBlock,
} from './model'

type Snapshot = { blocks: EditorBlock[]; content: Record<string, string> }

const TEXT_TYPES = new Set(['paragraph', 'heading', 'quote', 'list'])

function tagFor(b: EditorBlock): EditableTag {
  if (b.type === 'heading') return b.level >= 3 ? 'h3' : 'h2'
  if (b.type === 'quote') return 'blockquote'
  if (b.type === 'list') return 'div'
  return 'p'
}

// Content shown in a text block's contenteditable (list items joined by newline).
function initialMdFor(b: EditorBlock): string {
  if (b.type === 'list') return b.items.join('\n')
  if (b.type === 'heading' || b.type === 'quote' || b.type === 'paragraph') return b.md
  return ''
}

function placeholderFor(b: EditorBlock): string | undefined {
  if (b.type === 'paragraph') return "글을 입력하세요. 줄 시작에서 '## ', '- ', '> ' 입력"
  if (b.type === 'heading') return '제목'
  return undefined
}

export function WysiwygEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string
  onChange: (markdown: string) => void
}) {
  const [blocks, setBlocksState] = useState<EditorBlock[]>(() => parseDocument(initialMarkdown))
  const [gen, setGen] = useState(0)

  // blocksRef mirrors block state for handlers; setBlocks keeps it in sync (no
  // render-time write needed since blocks only change through setBlocks).
  const blocksRef = useRef(blocks)
  const contentRef = useRef<Map<string, string>>(new Map())
  const elRef = useRef<Map<string, HTMLElement>>(new Map())
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Undo/redo snapshots.
  const history = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])

  const setBlocks = (next: EditorBlock[]) => {
    blocksRef.current = next
    setBlocksState(next)
  }

  // Build the current document from state + live edited content.
  const currentBlocks = useCallback((): EditorBlock[] => {
    return blocksRef.current.map((b) => {
      if (!TEXT_TYPES.has(b.type)) return b
      const live = contentRef.current.get(b.id)
      if (live === undefined) return b
      if (b.type === 'list') return { ...b, items: live.split('\n') }
      if (b.type === 'heading') return { ...b, md: live }
      if (b.type === 'quote') return { ...b, md: live }
      return { ...b, md: live }
    })
  }, [])

  const snapshot = useCallback(
    (): Snapshot => ({
      blocks: blocksRef.current,
      content: Object.fromEntries(contentRef.current),
    }),
    [],
  )

  const commit = useCallback(() => {
    onChangeRef.current(serializeDocument(currentBlocks()))
  }, [currentBlocks])
  const commitRef = useRef(commit)
  useEffect(() => {
    commitRef.current = commit
  })

  const scheduleCommit = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = setTimeout(commit, 350)
  }, [commit])

  // --- element registry / focus ---
  // Focus is applied when the target block MOUNTS (registerEl), not on a timer —
  // structural edits remount the target (new id), so this is race-free.
  const pendingFocus = useRef<{ id: string; pos: 'start' | 'end' } | null>(null)

  const registerEl = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      elRef.current.set(id, el)
      const pf = pendingFocus.current
      if (pf && pf.id === id) {
        pendingFocus.current = null
        placeCaret(el, pf.pos)
      }
    } else {
      elRef.current.delete(id)
    }
  }, [])

  const focusBlock = useCallback((id: string, position: 'start' | 'end') => {
    const el = elRef.current.get(id)
    if (el) placeCaret(el, position)
    else pendingFocus.current = { id, pos: position } // consumed on mount
  }, [])

  // --- editing ---
  const handleChange = useCallback(
    (id: string, md: string) => {
      contentRef.current.set(id, md)
      scheduleCommit()
    },
    [scheduleCommit],
  )

  const readMd = useCallback((id: string): string => {
    const el = elRef.current.get(id)
    if (el) return htmlInlineToMd(el)
    return contentRef.current.get(id) ?? ''
  }, [])

  const pushHistory = useCallback(() => {
    history.current.push(snapshot())
    if (history.current.length > 100) history.current.shift()
    future.current = []
  }, [snapshot])

  const replaceBlocks = useCallback(
    (mutate: (blocks: EditorBlock[]) => EditorBlock[], focus?: { id: string; pos: 'start' | 'end' }) => {
      pushHistory()
      // Sync live content of current text blocks into contentRef before restructuring.
      for (const b of blocksRef.current) {
        if (TEXT_TYPES.has(b.type)) contentRef.current.set(b.id, readMd(b.id))
      }
      const next = mutate([...blocksRef.current])
      setBlocks(next)
      if (focus) focusBlock(focus.id, focus.pos)
      commit()
    },
    [commit, focusBlock, pushHistory, readMd],
  )

  const indexOf = (id: string) => blocksRef.current.findIndex((b) => b.id === id)

  // markdown shortcut on space at block start
  const trySpaceShortcut = useCallback(
    (id: string): boolean => {
      const el = elRef.current.get(id)
      if (!el) return false
      const text = (el.textContent ?? '').trim()
      const idx = indexOf(id)
      const type = blocksRef.current[idx]?.type
      if (type !== 'paragraph') return false

      let replacement: EditorBlock | null = null
      if (text === '#' || text === '##') replacement = { id: newId(), type: 'heading', level: 2, md: '' }
      else if (text === '###') replacement = { id: newId(), type: 'heading', level: 3, md: '' }
      else if (text === '-' || text === '*' || text === '+') replacement = { id: newId(), type: 'list', ordered: false, items: [''] }
      else if (text === '1.' || text === '1)') replacement = { id: newId(), type: 'list', ordered: true, items: [''] }
      else if (text === '>') replacement = { id: newId(), type: 'quote', md: '' }
      if (!replacement) return false

      const target = replacement
      contentRef.current.delete(id)
      contentRef.current.set(target.id, '')
      replaceBlocks((bs) => bs.map((b) => (b.id === id ? target : b)), { id: target.id, pos: 'start' })
      return true
    },
    [replaceBlocks],
  )

  const splitBlock = useCallback(
    (id: string) => {
      const el = elRef.current.get(id)
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0) return
      const caret = sel.getRangeAt(0)

      const before = document.createRange()
      before.setStart(el, 0)
      before.setEnd(caret.endContainer, caret.endOffset)
      const after = document.createRange()
      after.setStart(caret.endContainer, caret.endOffset)
      after.setEndAfter(el.lastChild ?? el)

      const beforeMd = htmlInlineToMd(before.cloneContents())
      const afterMd = htmlInlineToMd(after.cloneContents())

      const idx = indexOf(id)
      const cur = blocksRef.current[idx]
      if (!cur) return
      // The kept part retains the block's type; the new part is a paragraph.
      const kept: EditorBlock =
        cur.type === 'heading'
          ? { id: newId(), type: 'heading', level: cur.level, md: beforeMd }
          : cur.type === 'quote'
            ? { id: newId(), type: 'quote', md: beforeMd }
            : { id: newId(), type: 'paragraph', md: beforeMd }
      const added: EditorBlock = { id: newId(), type: 'paragraph', md: afterMd }

      contentRef.current.set(kept.id, beforeMd)
      contentRef.current.set(added.id, afterMd)
      replaceBlocks((bs) => [...bs.slice(0, idx), kept, added, ...bs.slice(idx + 1)], { id: added.id, pos: 'start' })
    },
    [replaceBlocks],
  )

  const backspaceAtStart = useCallback(
    (id: string): boolean => {
      const idx = indexOf(id)
      const cur = blocksRef.current[idx]
      if (!cur) return false

      // Non-paragraph → demote to paragraph first (keep content).
      if (cur.type !== 'paragraph') {
        const md = cur.type === 'list' ? readMd(id) : readMd(id)
        const para: EditorBlock = { id: newId(), type: 'paragraph', md }
        contentRef.current.set(para.id, md)
        replaceBlocks((bs) => bs.map((b) => (b.id === id ? para : b)), { id: para.id, pos: 'start' })
        return true
      }

      // Paragraph at doc start → nothing.
      if (idx === 0) return false
      const prev = blocksRef.current[idx - 1]
      if (!prev || !TEXT_TYPES.has(prev.type)) return false

      const prevMd = readMd(prev.id)
      const curMd = readMd(id)
      const mergedMd = prevMd + curMd
      const merged: EditorBlock =
        prev.type === 'heading'
          ? { id: newId(), type: 'heading', level: prev.level, md: mergedMd }
          : prev.type === 'quote'
            ? { id: newId(), type: 'quote', md: mergedMd }
            : { id: newId(), type: 'paragraph', md: mergedMd }
      contentRef.current.set(merged.id, mergedMd)
      replaceBlocks((bs) => [...bs.slice(0, idx - 1), merged, ...bs.slice(idx + 1)], {
        id: merged.id,
        // Caret at the join point ≈ end of previous content.
        pos: prevMd.length === 0 ? 'start' : 'end',
      })
      return true
    },
    [readMd, replaceBlocks],
  )

  const caretAtStart = (): boolean => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false
    const r = sel.getRangeAt(0)
    return r.collapsed && r.startOffset === 0 && isAtBlockStart(r.startContainer)
  }

  const handleKeyDown = useCallback(
    (id: string, e: React.KeyboardEvent<HTMLElement>) => {
      // Ignore during IME composition (keyCode 229 / isComposing).
      if (e.nativeEvent.isComposing) return

      const type = blocksRef.current[indexOf(id)]?.type

      if (e.key === ' ' && (type === 'paragraph')) {
        if (trySpaceShortcut(id)) e.preventDefault()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey && (type === 'paragraph' || type === 'heading')) {
        e.preventDefault()
        splitBlock(id)
        return
      }
      if (e.key === 'Backspace' && caretAtStart()) {
        if (backspaceAtStart(id)) e.preventDefault()
        return
      }
      // Inline marks
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'b' || e.key === 'i')) {
        e.preventDefault()
        document.execCommand(e.key === 'b' ? 'bold' : 'italic')
        handleChange(id, readMd(id))
      }
    },
    [backspaceAtStart, handleChange, readMd, splitBlock, trySpaceShortcut],
  )

  // Structured-block editors update state directly.
  const updateBlock = useCallback(
    (id: string, patch: Partial<EditorBlock>) => {
      pushHistory()
      setBlocks(blocksRef.current.map((b) => (b.id === id ? ({ ...b, ...patch } as EditorBlock) : b)))
      commit()
    },
    [commit, pushHistory],
  )

  const undo = useCallback(() => {
    const snap = history.current.pop()
    if (!snap) return
    future.current.push(snapshot())
    contentRef.current = new Map(Object.entries(snap.content))
    setBlocks(snap.blocks)
    setGen((g) => g + 1) // force remount so the DOM reflects restored content
    commit()
  }, [commit, snapshot])

  const redo = useCallback(() => {
    const snap = future.current.pop()
    if (!snap) return
    history.current.push(snapshot())
    contentRef.current = new Map(Object.entries(snap.content))
    setBlocks(snap.blocks)
    setGen((g) => g + 1)
    commit()
  }, [commit, snapshot])

  // Toolbar mark application (bold/italic via execCommand, code/link manual).
  const applyMark = (mark: 'bold' | 'italic' | 'code' | 'link') => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return
    const anchor = sel.anchorNode
    const host = anchor ? (anchor.nodeType === 1 ? (anchor as HTMLElement) : anchor.parentElement) : null
    const blockEl = host?.closest('[data-block-id]') as HTMLElement | null
    const id = blockEl?.dataset.blockId
    if (!id) return

    if (mark === 'bold' || mark === 'italic') {
      document.execCommand(mark)
    } else if (mark === 'code') {
      const range = sel.getRangeAt(0)
      const code = document.createElement('code')
      try {
        range.surroundContents(code)
      } catch {
        return
      }
    } else if (mark === 'link') {
      const url = window.prompt('링크 URL')
      if (!url) return
      const range = sel.getRangeAt(0)
      const a = document.createElement('a')
      a.href = url
      try {
        range.surroundContents(a)
      } catch {
        return
      }
    }
    handleChange(id, readMd(id))
  }

  // Paste as plain text (sanitize away foreign HTML/styles).
  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain')
    if (text === undefined) return
    e.preventDefault()
    document.execCommand('insertText', false, text)
  }

  // styleWithCSS off → execCommand emits <b>/<i> tags (not styled spans).
  useEffect(() => {
    try {
      document.execCommand('styleWithCSS', false, 'false')
    } catch {
      /* not all browsers */
    }
    return () => {
      if (commitTimer.current) clearTimeout(commitTimer.current)
      // Flush pending edits on unmount (e.g. toggling back to markdown mode).
      commitRef.current()
    }
  }, [])

  const onEditorKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
  }

  const rendered = useMemo(() => blocks, [blocks])

  return (
    <div className="wysiwyg" onKeyDownCapture={onEditorKeyDown} onPaste={onPaste}>
      <div className="mb-2 flex gap-1 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        {(
          [
            ['bold', 'B', 'font-bold'],
            ['italic', 'I', 'italic'],
            ['code', '<>', 'font-mono'],
            ['link', '🔗', ''],
          ] as const
        ).map(([mark, label, cls]) => (
          <button
            key={mark}
            type="button"
            // Keep the block's selection when clicking the toolbar.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyMark(mark)}
            className={`rounded px-2 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 ${cls}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {rendered.map((b) => {
          if (b.type === 'code') {
            return (
              <div key={`${gen}:${b.id}`} className="rounded-md border border-neutral-200 dark:border-neutral-800">
                <input
                  value={b.lang}
                  onChange={(e) => updateBlock(b.id, { lang: e.target.value })}
                  placeholder="언어 (예: ts)"
                  className="w-full rounded-t-md border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 font-mono text-xs outline-none dark:border-neutral-800 dark:bg-neutral-900"
                />
                <textarea
                  value={b.code}
                  onChange={(e) => updateBlock(b.id, { code: e.target.value })}
                  rows={Math.max(3, b.code.split('\n').length)}
                  spellCheck={false}
                  className="w-full resize-none rounded-b-md bg-neutral-50 p-3 font-mono text-sm outline-none dark:bg-neutral-900"
                />
              </div>
            )
          }
          if (b.type === 'image') {
            return (
              <div key={`${gen}:${b.id}`} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                {b.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.url} alt={b.alt} className="mb-2 max-h-48 rounded object-contain" />
                )}
                <input
                  value={b.url}
                  onChange={(e) => updateBlock(b.id, { url: e.target.value })}
                  placeholder="이미지 URL"
                  className="w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
                />
                <input
                  value={b.alt}
                  onChange={(e) => updateBlock(b.id, { alt: e.target.value })}
                  placeholder="대체 텍스트"
                  className="mt-1 w-full rounded border border-neutral-200 px-2 py-1 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
            )
          }
          const cls =
            b.type === 'heading'
              ? b.level >= 3
                ? 'text-lg font-semibold outline-none'
                : 'text-xl font-bold outline-none'
              : b.type === 'quote'
                ? 'border-l-2 border-neutral-300 pl-3 italic text-neutral-600 outline-none dark:border-neutral-700 dark:text-neutral-400'
                : b.type === 'list'
                  ? 'whitespace-pre-wrap rounded bg-neutral-50 px-3 py-1.5 outline-none dark:bg-neutral-900'
                  : 'outline-none'
          return (
            <EditableBlock
              key={`${gen}:${b.id}`}
              id={b.id}
              tag={tagFor(b)}
              initialMd={initialMdFor(b)}
              placeholder={placeholderFor(b)}
              className={cls}
              registerEl={registerEl}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />
          )
        })}
      </div>
    </div>
  )
}

function placeCaret(el: HTMLElement, pos: 'start' | 'end'): void {
  el.focus()
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(pos === 'start')
  sel.removeAllRanges()
  sel.addRange(range)
}

// True when the caret container is at the visual start of its block.
function isAtBlockStart(node: Node): boolean {
  let cur: Node | null = node
  while (cur && !(cur instanceof HTMLElement && cur.dataset.blockId)) {
    if (cur.previousSibling) return false
    cur = cur.parentNode
  }
  return true
}
