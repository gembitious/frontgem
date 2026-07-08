// The published document = frontmatter + markdown body. In Phase 3 the body
// becomes a block model; for now it's raw MDX text. This module owns the
// frontmatter shape, validation, and MDX serialization so /api/publish and the
// editor agree on one contract.

export type DraftFrontmatter = {
  title: string
  description: string
  date: string // YYYY-MM-DD
  tags: readonly string[]
  slug: string
  draft: boolean
}

export type DraftInput = DraftFrontmatter & { body: string }

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Returns human-readable errors; empty array means valid. Mirrors velite's schema limits. */
export function validateDraft(input: Partial<DraftInput>): string[] {
  const errors: string[] = []
  const title = input.title?.trim() ?? ''
  const description = input.description?.trim() ?? ''
  const slug = input.slug?.trim() ?? ''

  if (!title) errors.push('제목을 입력하세요.')
  else if (title.length > 120) errors.push('제목은 120자 이하여야 합니다.')

  if (!description) errors.push('요약을 입력하세요.')
  else if (description.length > 300) errors.push('요약은 300자 이하여야 합니다.')

  if (!slug) errors.push('슬러그를 입력하세요.')
  else if (!SLUG_RE.test(slug)) errors.push('슬러그는 영소문자·숫자·하이픈만 사용할 수 있습니다.')

  if (!input.date || !DATE_RE.test(input.date)) errors.push('날짜 형식이 올바르지 않습니다 (YYYY-MM-DD).')

  if (!input.body?.trim()) errors.push('본문을 입력하세요.')

  return errors
}

// Double-quoted YAML scalar via JSON — safely escapes quotes, colons, unicode.
function yamlString(value: string): string {
  return JSON.stringify(value)
}

export function serializeToMdx(fm: DraftFrontmatter, body: string): string {
  const lines = [
    '---',
    `title: ${yamlString(fm.title.trim())}`,
    `description: ${yamlString(fm.description.trim())}`,
    `date: ${fm.date}`,
    `tags: [${fm.tags.map((t) => yamlString(t)).join(', ')}]`,
  ]
  if (fm.draft) lines.push('draft: true')
  lines.push('---', '', body.trim(), '')
  return lines.join('\n')
}

/** "제목 — 요약" → slug candidate. Latin/number/hyphen only; Korean is stripped, so
 *  users typically set the slug manually. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
