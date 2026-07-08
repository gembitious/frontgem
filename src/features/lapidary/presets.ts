// Revision-direction presets. Shared by the options panel (UI) and the revise
// prompt builder (server) so labels and instructions never drift apart.
export const PRESETS = [
  { id: 'concise', label: '간결하게', prompt: '불필요한 수식어와 중복을 덜어 문장을 간결하게 다듬는다.' },
  {
    id: 'technical',
    label: '기술적 정확성',
    prompt: '기술 용어와 설명의 정확성을 높이고, 부정확하거나 모호한 표현을 바로잡는다.',
  },
  { id: 'rhythm', label: '문장 호흡', prompt: '긴 문장을 적절히 나누어 읽기 좋은 호흡을 만든다.' },
  { id: 'readability', label: '독자 눈높이', prompt: '독자가 이해하기 쉽도록 설명을 보강하고 눈높이를 맞춘다.' },
  {
    id: 'headings',
    label: '제목·소제목 제안',
    prompt: '내용에 맞게 제목과 소제목을 더 명확하고 매력적으로 다듬는다.',
  },
] as const

export type PresetId = (typeof PRESETS)[number]['id']

export function promptForPresets(ids: readonly string[]): string[] {
  return PRESETS.filter((p) => ids.includes(p.id)).map((p) => p.prompt)
}
