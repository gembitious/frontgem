import type { Metadata } from 'next'
import { Editor } from '@/features/editor/editor'

export const metadata: Metadata = {
  title: '글쓰기',
  robots: { index: false, follow: false },
}

// Access is enforced by middleware (redirects to /login when unauthenticated).
export default function WritePage() {
  return <Editor />
}
