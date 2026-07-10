// Selectable 퇴고 models. Shared by the options UI (dropdown) and the server
// (allowlist + provider routing) so a runtime model choice can't inject an
// arbitrary id. Flat list (no provider grouping). 'mock' is the free no-API path.
export type Provider = 'claude' | 'gemini' | 'mock'

export const MODELS = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', hint: '균형 · 추천', provider: 'claude' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', hint: '최고 품질', provider: 'claude' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: '빠르고 저렴', provider: 'claude' },
  {
    id: 'gemini-flash',
    label: 'Gemini Flash (무료)',
    hint: '무료 티어 · Google',
    provider: 'gemini',
    // Free tier: Google may use inputs/outputs to improve its products.
    warn: '무료 티어는 입력·출력이 Google 제품 개선(학습)에 사용될 수 있습니다. 민감한 초안은 Claude/미리보기를 쓰세요.',
  },
  { id: 'gemini-pro', label: 'Gemini Pro (유료)', hint: '고품질 · 유료', provider: 'gemini' },
  { id: 'mock', label: '미리보기 (AI 없음)', hint: '규칙 기반 · 키 불필요', provider: 'mock' },
] as const

export type ModelId = (typeof MODELS)[number]['id']

export const DEFAULT_MODEL: ModelId = 'claude-sonnet-5'

const BY_ID = new Map(MODELS.map((m) => [m.id, m]))

export function isAllowedModel(id: unknown): id is ModelId {
  return typeof id === 'string' && BY_ID.has(id as ModelId)
}

export function providerFor(id: ModelId): Provider {
  return BY_ID.get(id)!.provider
}
