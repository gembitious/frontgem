// Central site metadata. Reads NEXT_PUBLIC_SITE_URL in production (Vercel),
// falls back to localhost for dev so absolute URLs (RSS, OG, sitemap) resolve.
const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const site = {
  name: 'frontgem',
  title: 'frontgem — 원석을 깎아 발행한다',
  description:
    '초안(원석)을 깎아 발행(보석)하는 개인 기술 블로그. AI 퇴고 파이프라인 lapidary를 내장한다.',
  url: rawUrl.replace(/\/$/, ''),
  locale: 'ko_KR',
  author: {
    name: 'gembitious',
    github: 'https://github.com/gembitious',
  },
} as const

export type Site = typeof site
