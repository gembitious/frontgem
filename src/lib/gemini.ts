// Token-free key check: list models (metadata, not billed). Returns true if the
// key authenticates. Does NOT verify Pro billing / quota (only a real request does).
export async function geminiKeyOk(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

// Minimal Gemini streaming client (no SDK) — streams generateContent as SSE and
// yields text deltas, matching our /api/revise SSE proxy. Google AI Studio keys.
export async function* streamGemini(opts: {
  apiKey: string
  model: string
  system: string
  user: string
}): AsyncGenerator<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    opts.model,
  )}:streamGenerateContent?alt=sse`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: 'user', parts: [{ text: opts.user }] }],
      // No maxOutputTokens cap: thinking-enabled Gemini models count thought
      // tokens against it, and a tight cap can truncate to an empty answer.
    }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Gemini ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let finishReason: string | undefined
  let blockReason: string | undefined
  let yielded = false

  const parseEvent = (event: string): string => {
    // An SSE event can span multiple `data:` lines — join them.
    const json = event
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim())
      .join('')
    if (!json || json === '[DONE]') return ''
    try {
      const obj = JSON.parse(json) as {
        candidates?: {
          finishReason?: string
          content?: { parts?: { text?: string; thought?: boolean }[] }
        }[]
        promptFeedback?: { blockReason?: string }
      }
      const cand = obj.candidates?.[0]
      if (cand?.finishReason) finishReason = cand.finishReason
      if (obj.promptFeedback?.blockReason) blockReason = obj.promptFeedback.blockReason
      // Skip thought parts (thinking models) — only visible answer text.
      return cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ?? ''
    } catch {
      return '' // keep-alive / partial line
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // Google's SSE separates events with CRLF blank lines — split on both.
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() ?? ''
    for (const event of events) {
      const text = parseEvent(event)
      if (text) {
        yielded = true
        yield text
      }
    }
  }
  // Flush any final event left in the buffer (stream may end without a trailing blank line).
  const tail = parseEvent(buffer)
  if (tail) {
    yielded = true
    yield tail
  }

  if (!yielded) {
    const why = blockReason
      ? ` (차단 사유: ${blockReason})`
      : finishReason && finishReason !== 'STOP'
        ? ` (finishReason: ${finishReason})`
        : ''
    throw new Error(`Gemini가 빈 응답을 반환했습니다${why}. 다시 시도하거나 다른 모델을 선택하세요.`)
  }
}
