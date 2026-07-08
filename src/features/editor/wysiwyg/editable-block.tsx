'use client'

import { memo, useEffect, useRef } from 'react'
import { mdInlineToHtml, htmlInlineToMd } from '@/entities/document/inline'

export type EditableTag = 'p' | 'h2' | 'h3' | 'blockquote' | 'div'

type Props = {
  id: string
  tag: EditableTag
  initialMd: string
  placeholder?: string
  className?: string
  registerEl: (id: string, el: HTMLElement | null) => void
  onChange: (id: string, md: string) => void
  onKeyDown: (id: string, e: React.KeyboardEvent<HTMLElement>) => void
}

// The IME-safe contenteditable primitive.
//  - innerHTML is injected ONCE at mount (uncontrolled thereafter) → React never
//    rewrites the DOM under the caret, which is what breaks 한글 조합.
//  - compositionstart/end gates model sync: during composition we don't read the
//    DOM; on compositionend we sync once.
//  - Structural edits give affected blocks a NEW id upstream, so a content change
//    arrives as a fresh mount (new React key) rather than an in-place innerHTML
//    rewrite. That's why this effect can be mount-only.
function EditableBlockImpl({
  id,
  tag,
  initialMd,
  placeholder,
  className,
  registerEl,
  onChange,
  onKeyDown,
}: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const composing = useRef(false)
  // Callback ref (accepts HTMLElement) works for every concrete element type.
  const setRef = (el: HTMLElement | null) => {
    ref.current = el
  }

  useEffect(() => {
    const el = ref.current
    if (el) el.innerHTML = mdInlineToHtml(initialMd)
    registerEl(id, el)
    return () => registerEl(id, null)
    // Mount-only by design (see note above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => {
    const el = ref.current
    if (el) onChange(id, htmlInlineToMd(el))
  }

  const props = {
    ref: setRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    'data-placeholder': placeholder,
    'data-block-id': id,
    className,
    onCompositionStart: () => {
      composing.current = true
    },
    onCompositionEnd: () => {
      composing.current = false
      emit()
    },
    onInput: () => {
      if (!composing.current) emit()
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => onKeyDown(id, e),
  }

  if (tag === 'h2') return <h2 {...props} />
  if (tag === 'h3') return <h3 {...props} />
  if (tag === 'blockquote') return <blockquote {...props} />
  if (tag === 'div') return <div {...props} />
  return <p {...props} />
}

// Same id ⇒ never needs a re-render (content lives in the DOM); different id ⇒
// React remounts by key anyway. So compare on identity only.
export const EditableBlock = memo(
  EditableBlockImpl,
  (a, b) => a.id === b.id && a.tag === b.tag && a.className === b.className && a.placeholder === b.placeholder,
)
