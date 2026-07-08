import { NextResponse } from 'next/server'
import { SESSION_COOKIE, createSession, verifyPassword } from '@/lib/auth'
import { serverEnv } from '@/lib/env'

export async function POST(req: Request) {
  let password: unknown
  try {
    password = (await req.json())?.password
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: '비밀번호를 입력하세요.' }, { status: 400 })
  }

  const secret = serverEnv.authSecret()
  const ok = await verifyPassword(secret, password, serverEnv.adminPassword())
  if (!ok) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  const token = await createSession(secret)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
