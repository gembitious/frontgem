import { NextResponse } from 'next/server'
import { serialize } from 'next-mdx-remote-client/serialize'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeShiki from '@shikijs/rehype'

// Compiles the editor's markdown body to an MDX component source using the same
// remark/rehype pipeline as the published pages (so preview ≈ final render).
// Auth-gated by middleware. Imports/exports disabled so preview MDX can't reach
// server modules.
export async function POST(req: Request) {
  let body: string
  try {
    body = String((await req.json())?.body ?? '')
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  try {
    const result = await serialize({
      source: body,
      options: {
        parseFrontmatter: false,
        disableImports: true,
        disableExports: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }],
          ],
        },
      },
    })

    if (!('compiledSource' in result)) {
      // MDX syntax error → surface inline, not as an HTTP failure.
      return NextResponse.json({ error: result.error.message })
    }

    return NextResponse.json({
      compiledSource: result.compiledSource,
      frontmatter: result.frontmatter ?? {},
      scope: result.scope ?? {},
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '프리뷰 렌더링에 실패했습니다.'
    return NextResponse.json({ error: message })
  }
}
