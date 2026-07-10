// Server-only env access with explicit failures. Never import from client code.

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Set it in .env.local (dev) or your Vercel project settings.`,
    )
  }
  return value
}

export const serverEnv = {
  authSecret: () => required('AUTH_SECRET'),
  adminPassword: () => required('BLOG_ADMIN_PASSWORD'),
  githubToken: () => required('GITHUB_TOKEN'),
  githubOwner: () => process.env.GITHUB_OWNER ?? 'gembitious',
  githubRepo: () => process.env.GITHUB_REPO ?? 'frontgem',
  githubBranch: () => process.env.GITHUB_BRANCH ?? 'main',
  anthropicApiKey: () => required('ANTHROPIC_API_KEY'),
  // Default to Sonnet 5: knowledge-work/글쓰기 품질이 Opus 4.8과 동급이면서 ~40% 저렴 →
  // 구조 보존형 한국어 퇴고에 최적. env로 오버라이드 가능.
  anthropicModel: () => process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  geminiApiKey: () => required('GEMINI_API_KEY'),
  // `-latest` 별칭 → 항상 최신 Flash(무료)/Pro(유료). env로 고정 버전 지정 가능.
  geminiFlashModel: () => process.env.GEMINI_FLASH_MODEL ?? 'gemini-flash-latest',
  geminiProModel: () => process.env.GEMINI_PRO_MODEL ?? 'gemini-pro-latest',
}
