import { segmentWords } from './segment'

export type WordPart = {
  readonly type: 'equal' | 'insert' | 'delete'
  readonly text: string
}

// LCS diff over token arrays. Blocks are short (a paragraph), so O(n·m) DP is fine.
function diffTokens(a: readonly string[], b: readonly string[]): WordPart[] {
  const n = a.length
  const m = b.length

  // dp[i][j] = LCS length of a[i:] and b[j:].
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const row = dp[i]!
      if (a[i] === b[j]) row[j] = dp[i + 1]![j + 1]! + 1
      else row[j] = Math.max(dp[i + 1]![j]!, row[j + 1]!)
    }
  }

  const parts: WordPart[] = []
  const push = (type: WordPart['type'], text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.type === type) parts[parts.length - 1] = { type, text: last.text + text }
    else parts.push({ type, text })
  }

  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('equal', a[i]!)
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push('delete', a[i]!)
      i++
    } else {
      push('insert', b[j]!)
      j++
    }
  }
  while (i < n) push('delete', a[i++]!)
  while (j < m) push('insert', b[j++]!)

  return parts
}

/** Word/어절-level diff between two block texts, tokenized with Intl.Segmenter. */
export function diffWords(original: string, revised: string): WordPart[] {
  return diffTokens(segmentWords(original), segmentWords(revised))
}
