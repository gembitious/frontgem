import Link from 'next/link'
import { site } from '@/lib/site'
import { ThemeToggle } from './theme-toggle'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {site.name}
          <span className="text-emerald-600 dark:text-emerald-400">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/tags"
            className="rounded-md px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            태그
          </Link>
          <a
            href="/rss.xml"
            className="rounded-md px-3 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            RSS
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
