// Satori (next/og) ships only latin glyphs. Korean titles would render as tofu,
// so we fetch a Google Fonts subset containing *only* the characters we need —
// small and fast. Any failure degrades to the default font instead of breaking
// the build (OG images are non-critical).

const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com/css2'
// Chrome 35 predates woff2 support, so Google Fonts serves woff — which satori
// can parse (it only rejects woff2). Newer UAs get woff2 and fail.
const LEGACY_UA =
  'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.153 Safari/537.36'

// Font container signatures satori accepts: ttf (0x00010000 / 'true'), 'OTTO', 'wOFF'.
// It rejects 'wOF2' (woff2). Reject anything unparseable so ImageResponse never throws.
function isSupportedFont(data: ArrayBuffer): boolean {
  const sig = new Uint8Array(data, 0, 4)
  const tag = String.fromCharCode(...sig)
  if (tag === 'wOFF' || tag === 'OTTO' || tag === 'true' || tag === 'ttcf') return true
  // 0x00010000 = classic TrueType.
  return sig[0] === 0x00 && sig[1] === 0x01 && sig[2] === 0x00 && sig[3] === 0x00
}

export type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

export async function loadKoreanFont(
  text: string,
  weight: 400 | 700 = 700,
): Promise<OgFont[]> {
  try {
    const family = 'Noto Sans KR'
    const cssUrl = `${GOOGLE_FONTS_CSS}?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}`

    const css = await fetch(cssUrl, {
      headers: { 'User-Agent': LEGACY_UA },
      signal: AbortSignal.timeout(5000),
    }).then((res) => res.text())

    const fontUrl = css.match(/src:\s*url\(([^)]+)\)/)?.[1]
    if (!fontUrl) return []

    const data = await fetch(fontUrl, { signal: AbortSignal.timeout(5000) }).then((res) =>
      res.arrayBuffer(),
    )

    if (!isSupportedFont(data)) return []

    return [{ name: family, data, weight, style: 'normal' }]
  } catch {
    // Network/timeout/parse failure → fall back to satori's built-in font.
    return []
  }
}
