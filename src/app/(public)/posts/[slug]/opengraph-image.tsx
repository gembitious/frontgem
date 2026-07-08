import { ImageResponse } from 'next/og'
import { getAllPosts, getPostBySlug } from '@/lib/posts'
import { loadKoreanFont } from '@/lib/og'
import { site } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'frontgem post'

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  const title = post?.title ?? site.name
  const description = post?.description ?? site.description

  const fonts = await loadKoreanFont(`${title}${description}${site.name}원석을깎아발행한다`, 700)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, color: '#34d399' }}>
          {site.name}
          <span style={{ color: '#fafafa' }}>.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
          <div style={{ marginTop: 24, fontSize: 28, color: '#a3a3a3', lineHeight: 1.4 }}>
            {description.length > 90 ? `${description.slice(0, 90)}…` : description}
          </div>
        </div>
        <div style={{ fontSize: 24, color: '#737373' }}>원석을 깎아 발행한다</div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  )
}
