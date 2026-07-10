import { parseMarkdownToBlocks } from '@/entities/document/blocks'

// Rule-based stand-in for the AI rewrite so the whole 퇴고 → diff → merge → round
// flow can be exercised WITHOUT calling (and paying for) a model. Enabled by
// LAPIDARY_MOCK=1. Structure-preserving: code/image blocks are left verbatim;
// only prose gets light, reversible edits (typography, whitespace, filler).
const FILLERS = ['정말', '매우', '굉장히', '무척', '아주', '사실', '그냥']

function editProse(text: string, presets: readonly string[]): string {
  const concise = presets.includes('concise')
  return text
    .split('\n')
    .map((line) => {
      let out = line
        .replace(/[ \t]+$/g, '') // trailing whitespace
        .replace(/ {2,}/g, ' ') // collapse runs of spaces
        .replace(/\.\.\./g, '…') // typographic ellipsis
        .replace(/(\S)--(\S)/g, '$1—$2') // em dash
      // "간결하게" 프리셋이면 흔한 군더더기 부사를 덜어낸다(양옆 공백이 있을 때만 안전).
      if (concise) {
        for (const f of FILLERS) out = out.replaceAll(` ${f} `, ' ')
      }
      return out
    })
    .join('\n')
}

/** Produce a plausibly-edited version of the draft, preserving block structure. */
export function mockRevise(markdown: string, presets: readonly string[]): string {
  const blocks = parseMarkdownToBlocks(markdown)
  const out = blocks.map((b) => (b.type === 'code' || b.type === 'image' ? b.text : editProse(b.text, presets)))
  return out.join('\n\n').trim() + '\n'
}

/** Split text into chunks so mock output can be streamed like the real SSE path. */
export function chunkText(text: string, size = 48): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
  return chunks.length > 0 ? chunks : ['']
}
