import Link from 'next/link'
import * as runtime from 'react/jsx-runtime'
import type { ComponentPropsWithoutRef, ReactElement } from 'react'

// Velite's s.mdx() emits a function body that, given the jsx-runtime, returns
// the compiled component as `default`. Each post has its own compiled code, so
// the component is necessarily constructed at render time from a string.
function getMDXComponent(code: string) {
  const fn = new Function(code)
  return fn({ ...runtime }).default as (props: {
    components?: Record<string, unknown>
  }) => ReactElement
}

// Internal links use next/link for client nav; external links open safely.
function Anchor({ href = '', ...props }: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/')) {
    return <Link href={href} {...props} />
  }
  return <a href={href} target="_blank" rel="noreferrer noopener" {...props} />
}

const components = {
  a: Anchor,
}

export function MDXContent({ code }: { code: string }) {
  const Component = getMDXComponent(code)
  // Dynamically-compiled MDX component — cannot be hoisted to module scope.
  // eslint-disable-next-line react-hooks/static-components
  return <Component components={components} />
}
