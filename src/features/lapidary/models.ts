// Selectable 퇴고 models. Shared by the options UI (dropdown) and the server
// (allowlist) so a runtime model choice can't inject an arbitrary/expensive id.
// 'mock' is the free, no-API rule-based path.
export const MODELS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5', hint: '균형 · 기본' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8', hint: '최고 품질 · 고가' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: '저렴 · 빠름' },
  { id: 'mock', label: '목(무료)', hint: 'AI 없이 규칙 기반' },
] as const

export type ModelId = (typeof MODELS)[number]['id']

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-5'

const ALLOWED = new Set<string>(MODELS.map((m) => m.id))

export function isAllowedModel(id: unknown): id is ModelId {
  return typeof id === 'string' && ALLOWED.has(id)
}
