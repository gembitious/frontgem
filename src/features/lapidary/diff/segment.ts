// Korean word diff can't rely on whitespace tokenization: 조사 attach to 어절 and
// 띄어쓰기 is fluid. Intl.Segmenter('ko', word) splits on locale-aware word
// boundaries, returning every segment (words, spaces, punctuation) in order so
// joining them reproduces the input exactly — essential for lossless merging.
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('ko', { granularity: 'word' })
    : null

export function segmentWords(text: string): string[] {
  if (segmenter) {
    return Array.from(segmenter.segment(text), (s) => s.segment)
  }
  // Fallback for runtimes without Intl.Segmenter: keep whitespace runs as tokens.
  return text.match(/\S+|\s+/g) ?? []
}
