import { serverEnv } from './env'

// Minimal GitHub Contents API client — the whole "publish" mechanism.
// Committing to content/posts/ IS publishing; the push triggers a Vercel
// rebuild that recompiles content via velite. No DB.
const API = 'https://api.github.com'

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${serverEnv.githubToken()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

function repoPath(path: string): string {
  return `${API}/repos/${serverEnv.githubOwner()}/${serverEnv.githubRepo()}/contents/${path}`
}

/** sha of an existing file, or undefined if it doesn't exist (needed to update). */
export async function getFileSha(path: string): Promise<string | undefined> {
  const res = await fetch(`${repoPath(path)}?ref=${serverEnv.githubBranch()}`, {
    headers: headers(),
    cache: 'no-store',
  })
  if (res.status === 404) return undefined
  if (!res.ok) {
    throw new Error(`GitHub getFileSha ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { sha: string }
  return data.sha
}

export type PutFileResult = { commitUrl: string; contentSha: string }

/** Create or update a file. Pass sha to update an existing file. */
export async function putFile(opts: {
  path: string
  content: string
  message: string
  sha?: string
}): Promise<PutFileResult> {
  const body = {
    message: opts.message,
    content: Buffer.from(opts.content, 'utf8').toString('base64'),
    branch: serverEnv.githubBranch(),
    ...(opts.sha ? { sha: opts.sha } : {}),
  }

  const res = await fetch(repoPath(opts.path), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`GitHub putFile ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as {
    commit: { html_url: string }
    content: { sha: string }
  }
  return { commitUrl: data.commit.html_url, contentSha: data.content.sha }
}

/** Commit already-base64-encoded bytes (images/binaries) to a new path. */
export async function putBinaryFile(opts: {
  path: string
  contentBase64: string
  message: string
}): Promise<PutFileResult> {
  const res = await fetch(repoPath(opts.path), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({
      message: opts.message,
      content: opts.contentBase64,
      branch: serverEnv.githubBranch(),
    }),
  })
  if (!res.ok) {
    throw new Error(`GitHub putBinaryFile ${res.status}: ${await res.text()}`)
  }
  const data = (await res.json()) as { commit: { html_url: string }; content: { sha: string } }
  return { commitUrl: data.commit.html_url, contentSha: data.content.sha }
}

/** raw.githubusercontent URL for a committed path (immediately available; public repo). */
export function rawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${serverEnv.githubOwner()}/${serverEnv.githubRepo()}/${serverEnv.githubBranch()}/${path}`
}
