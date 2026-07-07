import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: '로그인',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  // Only allow internal redirect targets.
  const safeFrom = from && from.startsWith('/') && !from.startsWith('//') ? from : '/write'
  return <LoginForm from={safeFrom} />
}
