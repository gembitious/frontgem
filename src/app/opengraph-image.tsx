import { ImageResponse } from 'next/og'
import { loadKoreanFont } from '@/lib/og'
import { site } from '@/lib/site'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = site.title

export default async function OgImage() {
  const fonts = await loadKoreanFont(`${site.name}원석을 깎아 발행한다개인 기술 블로그`, 700)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fafafa',
          padding: '72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 88, fontWeight: 700 }}>
          {site.name}
          <span style={{ color: '#34d399' }}>.</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 36, color: '#a3a3a3' }}>원석을 깎아 발행한다</div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined },
  )
}
