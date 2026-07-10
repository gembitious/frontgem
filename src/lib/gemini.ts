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
      generationConfig: { maxOutputTokens: 8192 },
    }),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Gemini ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() ?? ''
    for (const chunk of chunks) {
      const line = chunk.trim()
      if (!line.startsWith('data:')) continue
      const json = line.slice(5).trim()
      if (!json || json === '[DONE]') continue
      try {
        const obj = JSON.parse(json) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }
        const text = obj.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        if (text) yield text
      } catch {
        // ignore keep-alive / partial lines
      }
    }
  }
}
