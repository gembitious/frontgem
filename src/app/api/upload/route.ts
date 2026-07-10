import { NextResponse } from 'next/server'
import { putBinaryFile, rawUrl } from '@/lib/github'

// Auth-gated by middleware. Commits an uploaded image to public/uploads/ and
// returns its raw.githubusercontent URL (available immediately, and after deploy).
export const maxDuration = 60

const MAX_BYTES = 5 * 1024 * 1024

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
}

export async function POST(req: Request) {
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일이 없습니다.' }, { status: 422 })
  }
  const ext = EXT[file.type]
  if (!ext) {
    return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 422 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '5MB 이하만 업로드할 수 있습니다.' }, { status: 422 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const base = (file.name.replace(/\.[^.]+$/, '') || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
  const path = `public/uploads/${Date.now()}-${base}.${ext}`

  try {
    await putBinaryFile({
      path,
      contentBase64: bytes.toString('base64'),
      message: `upload: ${path.split('/').pop()}`,
    })
    return NextResponse.json({ url: rawUrl(path), alt: base })
  } catch (err) {
    const message = err instanceof Error ? err.message : '업로드에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
