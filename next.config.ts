import type { NextConfig } from 'next'

// Velite runs as a build step via npm scripts (see package.json), not from here:
// Next 16's config loader uses require(), which rejects the top-level await that
// velite's async build() would need. `velite && next build` keeps content fresh.

const nextConfig: NextConfig = {
  // Content lives in git as MDX; images referenced from posts are processed by
  // Velite into /public. No remote image domains needed for Phase 1.
  reactStrictMode: true,
}

export default nextConfig
