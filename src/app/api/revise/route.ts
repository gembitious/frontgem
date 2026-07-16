import Anthropic from '@anthropic-ai/sdk'
import { serverEnv } from '@/lib/env'
import { promptForPresets } from '@/features/lapidary/presets'
import { mockRevise, chunkText } from '@/features/lapidary/mock'
import { isAllowedModel, providerFor } from '@/features/lapidary/models'
import { NOTE_MARKER } from '@/features/lapidary/note'
import { streamGemini } from '@/lib/gemini'

// Auth-gated by middleware. Streams the rewrite as SSE so the editor can render
// tokens live. The diff is computed client-side once the full text arrives.
export const maxDuration = 120

const SYSTEM = `당신은 'lapidary', 한국어 기술 블로그 글을 다듬는 퇴고 편집자다.
초안을 주어진 수정 방향에 맞춰 다시 쓴다. 반드시 지킬 규칙:
- 마크다운 구조를 그대로 보존한다: 헤딩 레벨(#, ##), 리스트, 인용(>), 문단 구분.
- 코드블록(\`\`\` ... \`\`\`) 안의 내용은 절대 바꾸지 않는다. 펜스·언어 표기·내부 텍스트를 그대로 둔다.
- 문단 분할을 유지한다. 문단을 함부로 합치거나 쪼개지 않는다('문장 호흡' 지시가 있을 때만 예외).
- 원문의 의미와 사실을 왜곡하지 않는다.
- 먼저 다시 쓴 마크다운 본문만 낸다. 머리말·감싸는 코드펜스 없이 본문만.
- 본문이 끝나면 정확히 다음 구분선 한 줄을 쓰고, 그 아래에 퇴고 의견을 2~5문장으로 덧붙인다:
${NOTE_MARKER}
- 의견에는 무엇을 왜 고쳤는지 요약하고, 자동으로 반영할 수 없는 제안(내용 보강, 구성 변경,
  예시 추가 등)이 있으면 함께 적는다. 고칠 게 거의 없으면 그렇게 말해도 된다.`

function buildUserPrompt(body: string, presets: readonly string[], instruction: string): string {
  const directions = promptForPresets(presets)
  const lines: string[] = ['# 수정 방향']
  if (directions.length > 0) lines.push(...directions.map((d) => `- ${d}`))
  else lines.push('- 전반적으로 문장을 자연스럽고 명료하게 다듬는다.')
  if (instruction.trim()) lines.push('', `# 추가 지시\n${instruction.trim()}`)
  lines.push('', '# 초안', body)
  return lines.join('\n')
}

function sse(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: Request) {
  let payload: { body?: string; presets?: string[]; instruction?: string; model?: string }
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const body = payload.body ?? ''
  if (!body.trim()) {
    return new Response('empty body', { status: 422 })
  }
  const presets = Array.isArray(payload.presets) ? payload.presets : []
  const instruction = typeof payload.instruction === 'string' ? payload.instruction : ''

  // Per-request model choice (validated against the allowlist); falls back to the
  // env default (Claude). 'mock' or LAPIDARY_MOCK=1 uses the free rule-based path.
  const selected = isAllowedModel(payload.model) ? payload.model : null
  const provider = selected ? providerFor(selected) : 'claude'
  const mock = process.env.LAPIDARY_MOCK === '1' || provider === 'mock'
  const userPrompt = buildUserPrompt(body, presets, instruction)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (mock) {
          const mockOut = `${mockRevise(body, presets)}\n${NOTE_MARKER}\n미리보기 모드입니다. 규칙 기반 정리(공백·군더더기 부사·문장부호)만 적용했습니다. 실제 AI 의견은 Claude/Gemini 모델을 선택하면 제공됩니다.`
          for (const chunk of chunkText(mockOut)) {
            controller.enqueue(sse({ text: chunk }))
          }
          controller.enqueue(sse({ done: true }))
          return
        }

        if (provider === 'gemini') {
          const geminiModel =
            selected === 'gemini-pro' ? serverEnv.geminiProModel() : serverEnv.geminiFlashModel()
          for await (const text of streamGemini({
            apiKey: serverEnv.geminiApiKey(),
            model: geminiModel,
            system: SYSTEM,
            user: userPrompt,
          })) {
            controller.enqueue(sse({ text }))
          }
          controller.enqueue(sse({ done: true }))
          return
        }

        const client = new Anthropic({ apiKey: serverEnv.anthropicApiKey() })
        // Past the mock guard `selected` is a concrete model or null.
        const model = selected ?? serverEnv.anthropicModel()
        // adaptive thinking + effort are only accepted by the 4.6+/5 families. On
        // older tiers (e.g. Haiku 4.5) sending them returns a 400 — so send a plain
        // request there instead. Keeps any ANTHROPIC_MODEL choice working.
        const supportsAdaptive = /opus-4-[678]|sonnet-5|sonnet-4-6|fable-5|mythos-5/.test(model)
        const params: Parameters<typeof client.messages.stream>[0] = {
          model,
          max_tokens: 32000,
          system: SYSTEM,
          messages: [{ role: 'user', content: userPrompt }],
        }
        if (supportsAdaptive) {
          // Quality rewrite without max latency; streaming avoids HTTP timeouts.
          params.thinking = { type: 'adaptive' }
          params.output_config = { effort: 'medium' }
        }

        const anthropicStream = client.messages.stream(params)
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(sse({ text: event.delta.text }))
          }
        }
        const final = await anthropicStream.finalMessage()
        if (final.stop_reason === 'refusal') {
          controller.enqueue(sse({ error: '모델이 요청을 거부했습니다.' }))
        }
        controller.enqueue(sse({ done: true }))
      } catch (err) {
        const message = err instanceof Error ? err.message : '퇴고 요청에 실패했습니다.'
        controller.enqueue(sse({ error: message }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
