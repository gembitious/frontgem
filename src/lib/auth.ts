// Personal-admin auth: a single env password + an HMAC-signed session cookie.
// Uses Web Crypto only, so the same code verifies in edge middleware and in
// Node route handlers. Upgrade path to GitHub OAuth is noted in CLAUDE.md.

export const SESSION_COOKIE = 'frontgem_session'
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

const encoder = new TextEncoder()

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4)
  const bin = atob(normalized + '='.repeat(pad))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  return new Uint8Array(sig)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

/** Constant-length comparison of two secrets by HMAC (avoids length/timing leaks). */
export async function verifyPassword(
  secret: string,
  input: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([hmac(secret, `pw:${input}`), hmac(secret, `pw:${expected}`)])
  return timingSafeEqual(a, b)
}

export async function createSession(secret: string, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<string> {
  const payload = base64url(encoder.encode(JSON.stringify({ exp: Date.now() + ttlSeconds * 1000 })))
  const sig = base64url(await hmac(secret, payload))
  return `${payload}.${sig}`
}

export async function verifySession(secret: string, token: string | undefined): Promise<boolean> {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false

  const expected = base64url(await hmac(secret, payload))
  if (!timingSafeEqual(fromBase64url(sig), fromBase64url(expected))) return false

  try {
    const decoded = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as { exp?: unknown }
    return typeof decoded.exp === 'number' && decoded.exp > Date.now()
  } catch {
    return false
  }
}
