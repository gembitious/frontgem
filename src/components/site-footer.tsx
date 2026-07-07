import { site } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-200 py-8 dark:border-neutral-800">
      <div className="mx-auto flex max-w-3xl flex-col gap-1 px-4 text-sm text-neutral-500">
        <p>
          © {site.author.name} · 원석을 깎아 발행한다
        </p>
        <p>
          <a
            href={site.author.github}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
