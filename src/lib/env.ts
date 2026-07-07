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
}
