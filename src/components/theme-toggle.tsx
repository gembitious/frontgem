'use client'

import { useTheme } from 'next-themes'

// Sun/moon inline SVGs — no icon dependency for Phase 1.
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  // next-themes resolves the theme only after it mounts on the client, so
  // resolvedTheme is undefined during SSR *and* the first client render — they
  // match, so no hydration mismatch and no self-managed mounted flag needed.
  const ready = resolvedTheme !== undefined
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex size-9 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      {ready ? isDark ? <SunIcon /> : <MoonIcon /> : <span className="size-5" />}
    </button>
  )
}
