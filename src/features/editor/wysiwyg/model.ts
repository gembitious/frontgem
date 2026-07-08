import { parseMarkdownToBlocks, type Block } from '@/entities/document/blocks'

// Edit-friendly block shapes for the WYSIWYG editor. The document's canonical
// form stays markdown (blocks.ts); these are decoded per-block for editing and
// re-encoded on every change so `body` markdown remains the single source of
// truth (publish/preview/lapidary all read it).
export type EditorBlock =
  | { readonly id: string; readonly type: 'paragraph'; readonly md: string }
  | { readonly id: string; readonly type: 'heading'; readonly level: number; readonly md: string }
  | { readonly id: string; readonly type: 'quote'; readonly md: string }
  | { readonly id: string; readonly type: 'list'; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly id: string; readonly type: 'code'; readonly lang: string; readonly code: string }
  | { readonly id: string; readonly type: 'image'; readonly alt: string; readonly url: string }

export type EditableTextBlock = Extract<EditorBlock, { type: 'paragraph' | 'heading' | 'quote' }>

let idCounter = 0
export function newId(): string {
  idCounter += 1
  return `e${idCounter}`
}

function fromBlock(b: Block): EditorBlock {
  const id = newId()
  const text = b.text

  if (b.type === 'heading') {
    const m = text.match(/^(#{1,6})\s+([\s\S]*)$/)
    return { id, type: 'heading', level: m ? m[1]!.length : 2, md: m ? m[2]!.trim() : text.replace(/^#+\s*/, '') }
  }
  if (b.type === 'code') {
    const lines = text.split('\n')
    const first = lines[0] ?? ''
    const lang = first.replace(/^(```|~~~)/, '').trim()
    // Drop the opening and closing fence lines.
    const inner = lines.slice(1, lines[lines.length - 1]?.trimStart().startsWith('```') || lines[lines.length - 1]?.trimStart().startsWith('~~~') ? -1 : undefined)
    return { id, type: 'code', lang, code: inner.join('\n') }
  }
  if (b.type === 'quote') {
    const md = text
      .split('\n')
      .map((l) => l.replace(/^>\s?/, ''))
      .join('\n')
    return { id, type: 'quote', md }
  }
  if (b.type === 'list') {
    const lines = text.split('\n').filter((l) => l.trim() !== '')
    const ordered = /^\s*\d+[.)]/.test(lines[0] ?? '')
    const items = lines.map((l) => l.replace(/^\s*([-*+]|\d+[.)])\s+/, ''))
    return { id, type: 'list', ordered, items }
  }
  if (b.type === 'image') {
    const m = text.match(/^!\[([^\]]*)\]\(([^)]*)\)/)
    return { id, type: 'image', alt: m?.[1] ?? '', url: m?.[2] ?? '' }
  }
  return { id, type: 'paragraph', md: text }
}

/** Markdown document → editor blocks. */
export function parseDocument(markdown: string): EditorBlock[] {
  const blocks = parseMarkdownToBlocks(markdown)
  return blocks.length > 0 ? blocks.map(fromBlock) : [{ id: newId(), type: 'paragraph', md: '' }]
}

/** One editor block → its markdown source. */
export function blockToMarkdown(b: EditorBlock): string {
  switch (b.type) {
    case 'heading':
      return `${'#'.repeat(Math.min(Math.max(b.level, 1), 6))} ${b.md}`
    case 'quote':
      return b.md
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')
    case 'list':
      return b.items.map((it, i) => `${b.ordered ? `${i + 1}.` : '-'} ${it}`).join('\n')
    case 'code':
      return `\`\`\`${b.lang}\n${b.code}\n\`\`\``
    case 'image':
      return `![${b.alt}](${b.url})`
    case 'paragraph':
    default:
      return b.md
  }
}

/** Editor blocks → markdown document. */
export function serializeDocument(blocks: readonly EditorBlock[]): string {
  return (
    blocks
      .map(blockToMarkdown)
      .filter((s, i) => s.trim() !== '' || blocks.length === 1 && i === 0)
      .join('\n\n')
      .trim() + '\n'
  )
}
