import { parseMarkdownToBlocks } from '@/entities/document/blocks'
import { buildHunks, type Hunk } from './hunks'

export type { WordPart } from './words'
export type { Hunk, HunkStatus, HunkKind } from './hunks'
export { mergeHunks, pendingCount } from './hunks'

/** Full lapidary diff: markdown → blocks → block-aligned hunks with word diffs. */
export function computeDiff(originalMarkdown: string, revisedMarkdown: string): Hunk[] {
  const original = parseMarkdownToBlocks(originalMarkdown)
  const revised = parseMarkdownToBlocks(revisedMarkdown)
  return buildHunks(original, revised)
}
