import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { geminiKeyOk } from '@/lib/gemini'

// Token-free provider status for the model dropdown. Auth-gated by middleware.
//  - configured: server env key present
//  - ok: the key authenticates via a metadata call (models list — NOT billed)
// Note: ok=true does NOT guarantee credits/paid-plan; that only surfaces on an
// actual 퇴고 request. So credit/billing failures still surface at use time.
export const dynamic = 'force-dynamic'

type ProviderStatus = { configured: boolean; ok: boolean; reason?: 'missing' | 'invalid' | 'error' }

async function checkClaude(): Promise<ProviderStatus> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { configured: false, ok: false, reason: 'missing' }
  try {
    // Models API is metadata — validates the key without consuming tokens.
    await new Anthropic({ apiKey: key }).models.list({ limit: 1 })
    return { configured: true, ok: true }
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : 0
    return { configured: true, ok: false, reason: status === 401 ? 'invalid' : 'error' }
  }
}

async function checkGemini(): Promise<ProviderStatus> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { configured: false, ok: false, reason: 'missing' }
  const ok = await geminiKeyOk(key)
  return { configured: true, ok, reason: ok ? undefined : 'invalid' }
}

export async function GET() {
  const [claude, gemini] = await Promise.all([checkClaude(), checkGemini()])
  return NextResponse.json({
    claude,
    gemini,
    mock: { configured: true, ok: true },
  })
}
