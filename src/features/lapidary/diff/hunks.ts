import type { Block } from '@/entities/document/blocks'
import { diffWords, type WordPart } from './words'

// git-add-p-style hunk: the unit of accept/reject. Aligned by block (LCS), then
// changed blocks carry an inline word diff.
export type HunkStatus = 'pending' | 'accepted' | 'rejected' | 'edited'
export type HunkKind = 'equal' | 'change' | 'insert' | 'delete'

export type Hunk = {
  readonly id: string
  readonly kind: HunkKind
  readonly original: string
  readonly revised: string
  readonly words: readonly WordPart[] | null
  readonly status: HunkStatus
  readonly edited: string | null
}

type BlockOp =
  | { readonly type: 'equal'; readonly a: Block; readonly b: Block }
  | { readonly type: 'delete'; readonly a: Block }
  | { readonly type: 'insert'; readonly b: Block }

const normalize = (b: Block): string => b.text.trim()

// LCS alignment of two block sequences by normalized text equality.
function alignBlocks(a: readonly Block[], b: readonly Block[]): BlockOp[] {
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i]!
      if (normalize(a[i]!) === normalize(b[j]!)) row[j] = dp[i + 1]![j + 1]! + 1
      else row[j] = Math.max(dp[i + 1]![j]!, row[j + 1]!)
    }
  }

  const ops: BlockOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (normalize(a[i]!) === normalize(b[j]!)) {
      ops.push({ type: 'equal', a: a[i]!, b: b[j]! })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ type: 'delete', a: a[i]! })
      i++
    } else {
      ops.push({ type: 'insert', b: b[j]! })
      j++
    }
  }
  while (i < n) ops.push({ type: 'delete', a: a[i++]! })
  while (j < m) ops.push({ type: 'insert', b: b[j++]! })
  return ops
}

/**
 * Align blocks, then within each changed gap pair deletions with insertions
 * 1:1 (a modified block) and compute the inline word diff for each pair. Leftover
 * deletions/insertions become pure delete/insert hunks.
 */
export function buildHunks(original: readonly Block[], revised: readonly Block[]): Hunk[] {
  const ops = alignBlocks(original, revised)
  const hunks: Hunk[] = []
  let seq = 0
  const id = () => `h${(seq += 1)}`

  let dels: Block[] = []
  let inss: Block[] = []
  const flushGap = () => {
    const k = Math.max(dels.length, inss.length)
    for (let x = 0; x < k; x++) {
      const d = dels[x]
      const s = inss[x]
      if (d && s) {
        hunks.push({
          id: id(),
          kind: 'change',
          original: d.text,
          revised: s.text,
          words: diffWords(d.text, s.text),
          status: 'pending',
          edited: null,
        })
      } else if (d) {
        hunks.push({ id: id(), kind: 'delete', original: d.text, revised: '', words: null, status: 'pending', edited: null })
      } else if (s) {
        hunks.push({ id: id(), kind: 'insert', original: '', revised: s.text, words: null, status: 'pending', edited: null })
      }
    }
    dels = []
    inss = []
  }

  for (const op of ops) {
    if (op.type === 'equal') {
      flushGap()
      hunks.push({ id: id(), kind: 'equal', original: op.a.text, revised: op.a.text, words: null, status: 'accepted', edited: null })
    } else if (op.type === 'delete') {
      dels.push(op.a)
    } else {
      inss.push(op.b)
    }
  }
  flushGap()

  return hunks
}

/** Resolve one hunk to its merged text. pending/rejected keep the ORIGINAL state
 *  (undecided suggestions are not applied), so merging an untouched diff yields
 *  the original document. Accept pulls the suggestion in. */
function resolveHunk(h: Hunk): string {
  if (h.kind === 'equal') return h.original
  if (h.status === 'edited') return h.edited ?? h.original
  if (h.status === 'accepted') return h.revised // delete → '' (removed); insert/change → new text
  // pending or rejected → original state
  return h.kind === 'insert' ? '' : h.original
}

/** Merge hunks (respecting each status) back into a markdown document. */
export function mergeHunks(hunks: readonly Hunk[]): string {
  const parts: string[] = []
  for (const h of hunks) {
    const out = resolveHunk(h)
    if (out.trim() !== '') parts.push(out)
  }
  return parts.join('\n\n').trim() + '\n'
}

/** Count hunks that still need a decision (changed hunks left pending). */
export function pendingCount(hunks: readonly Hunk[]): number {
  return hunks.filter((h) => h.kind !== 'equal' && h.status === 'pending').length
}
