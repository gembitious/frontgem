import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getFileSha, putFile } from '@/lib/github'
import { serializeToMdx, validateDraft, type DraftInput } from '@/entities/document/frontmatter'

// Auth is enforced by middleware (matcher covers /api/publish).
export async function POST(req: Request) {
  let input: Partial<DraftInput>
  try {
    input = (await req.json()) as Partial<DraftInput>
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const errors = validateDraft(input)
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('\n'), errors }, { status: 422 })
  }

  const draft = input as DraftInput
  const path = `content/posts/${draft.slug}.mdx`
  const mdx = serializeToMdx(draft, draft.body)

  try {
    const existingSha = await getFileSha(path)
    const message = existingSha
      ? `post: update ${draft.slug}`
      : `post: publish ${draft.slug}`
    const result = await putFile({ path, content: mdx, message, sha: existingSha })

    // Best-effort revalidation. Note: content is compiled at build time by velite,
    // so brand-new posts actually appear after the commit's Vercel rebuild; this
    // mainly helps if ISR is layered on later. Harmless either way.
    try {
      revalidatePath('/')
      revalidatePath('/tags')
      revalidatePath(`/posts/${draft.slug}`)
    } catch {
      // revalidation is non-critical
    }

    return NextResponse.json({
      ok: true,
      slug: draft.slug,
      updated: Boolean(existingSha),
      commitUrl: result.commitUrl,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '발행에 실패했습니다.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
