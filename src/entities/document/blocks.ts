// The block model is the document's single source of truth (CLAUDE.md). The diff
// engine (Phase 3) consumes it before the WYSIWYG editor (Phase 4) does. A block
// is a contiguous markdown unit; the diff aligns on blocks, then diffs words
// within aligned blocks.
export type BlockType = 'paragraph' | 'heading' | 'code' | 'list' | 'image' | 'quote'

export type Block = {
  readonly id: string
  readonly type: BlockType
  /** The block's raw markdown source (verbatim for code). */
  readonly text: string
}

const FENCE_RE = /^(```|~~~)/
const HEADING_RE = /^#{1,6}\s/
const QUOTE_RE = /^>\s?/
const LIST_RE = /^(\s*)([-*+]|\d+[.)])\s/
const IMAGE_RE = /^!\[[^\]]*\]\([^)]*\)\s*$/

let counter = 0
// Deterministic ids (no Math.random) so parsing is pure and re-runs are stable.
function nextId(): string {
  counter += 1
  return `b${counter}`
}

/** Reset the id counter — call before a fresh parse when stable ids across runs matter. */
export function resetBlockIds(): void {
  counter = 0
}

function makeBlock(type: BlockType, lines: readonly string[]): Block {
  return { id: nextId(), type, text: lines.join('\n') }
}

/**
 * Split markdown into blocks. Fenced code is preserved verbatim (blank lines and
 * all); lists and blockquotes absorb their contiguous lines; blank lines separate
 * paragraphs. This is intentionally a pragmatic splitter, not a full CommonMark
 * parser — it only needs to produce stable units for diffing and round-tripping.
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i] ?? ''

    // Blank lines are separators.
    if (line.trim() === '') {
      i += 1
      continue
    }

    // Fenced code block — consume until the matching closing fence.
    const fence = line.match(FENCE_RE)?.[1]
    if (fence) {
      const buf = [line]
      i += 1
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        buf.push(cur)
        i += 1
        if (cur.trimStart().startsWith(fence)) break
      }
      blocks.push(makeBlock('code', buf))
      continue
    }

    // Heading (single line).
    if (HEADING_RE.test(line)) {
      blocks.push(makeBlock('heading', [line]))
      i += 1
      continue
    }

    // Standalone image.
    if (IMAGE_RE.test(line)) {
      blocks.push(makeBlock('image', [line]))
      i += 1
      continue
    }

    // Blockquote — consume contiguous quoted lines.
    if (QUOTE_RE.test(line)) {
      const buf: string[] = []
      while (i < lines.length && QUOTE_RE.test(lines[i] ?? '')) {
        buf.push(lines[i] ?? '')
        i += 1
      }
      blocks.push(makeBlock('quote', buf))
      continue
    }

    // List — consume contiguous list items (and their blank-free continuations).
    if (LIST_RE.test(line)) {
      const buf: string[] = []
      while (i < lines.length) {
        const cur = lines[i] ?? ''
        if (cur.trim() === '') break
        if (!LIST_RE.test(cur) && !/^\s+\S/.test(cur)) break
        buf.push(cur)
        i += 1
      }
      blocks.push(makeBlock('list', buf))
      continue
    }

    // Paragraph — consume until a blank line or a structural line.
    const buf: string[] = []
    while (i < lines.length) {
      const cur = lines[i] ?? ''
      if (cur.trim() === '') break
      if (FENCE_RE.test(cur) || HEADING_RE.test(cur) || QUOTE_RE.test(cur) || LIST_RE.test(cur)) break
      buf.push(cur)
      i += 1
    }
    blocks.push(makeBlock('paragraph', buf))
  }

  return blocks
}

/** Blocks → markdown. Inverse of parse: one blank line between blocks. */
export function serializeBlocksToMarkdown(blocks: readonly Block[]): string {
  return blocks.map((b) => b.text).join('\n\n').trim() + '\n'
}
